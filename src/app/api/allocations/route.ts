import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { AllocationStatus, ListingStatus, RequestStatus, PickupStatus } from "@prisma/client";

// GET /api/allocations - Retrieve allocations history and status
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const requestId = searchParams.get("requestId");
    const listingId = searchParams.get("listingId");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (status && Object.values(AllocationStatus).includes(status as AllocationStatus)) {
      where.allocation_status = status as AllocationStatus;
    }
    if (requestId) where.request_id = parseInt(requestId, 10);
    if (listingId) where.listing_id = parseInt(listingId, 10);

    const allocations = await prisma.requestAllocation.findMany({
      where,
      include: {
        request: {
          include: {
            ngo: { select: { ngo_name: true, contact_person: true } },
            beneficiaryGroup: { select: { group_name: true, target_headcount: true } },
          },
        },
        listing: {
          include: {
            donor: {
              include: { user: { select: { full_name: true, phone: true } } },
            },
          },
        },
        allocatedByUser: {
          select: { id: true, full_name: true, email: true },
        },
        pickups: {
          include: {
            volunteer: {
              include: { user: { select: { full_name: true, phone: true } } },
            },
          },
        },
        distributions: true,
      },
      orderBy: { allocated_at: "desc" },
    });

    return NextResponse.json({ allocations });
  } catch (error: unknown) {
    console.error("Fetch allocations error:", error);
    return NextResponse.json({ error: "Failed to fetch allocations" }, { status: 500 });
  }
}

// POST /api/allocations - Perform ACID Transactional Food Stock Allocation
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (user.role !== "ADMIN" && user.role !== "NGO") {
      return NextResponse.json(
        { error: "Forbidden: Only Admins or authorized coordinators can allocate food stock" },
        { status: 403 }
      );
    }

    const { requestId, listingId, allocatedQuantity, useStoredProcedure = false } = await req.json();

    const rId = parseInt(requestId, 10);
    const lId = parseInt(listingId, 10);
    const allocQty = parseFloat(allocatedQuantity);

    if (isNaN(rId) || isNaN(lId) || isNaN(allocQty) || allocQty <= 0) {
      return NextResponse.json(
        { error: "Invalid allocation input: valid requestId, listingId and quantity > 0 are required." },
        { status: 400 }
      );
    }

    // --------------------------------------------------------------------------
    // PATH A: Use MySQL Stored Procedure `sp_allocate_food_stock`
    // --------------------------------------------------------------------------
    if (useStoredProcedure) {
      try {
        // Execute the stored procedure via raw query
        await prisma.$executeRawUnsafe(
          "CALL sp_allocate_food_stock(?, ?, ?, ?, @alloc_id, @res_code, @res_msg);",
          rId,
          lId,
          allocQty,
          user.id
        );

        // Fetch the output variables
        const result = (await prisma.$queryRawUnsafe(
          "SELECT @alloc_id AS alloc_id, @res_code AS res_code, @res_msg AS res_msg;"
        )) as Array<{ alloc_id: number | null; res_code: string; res_msg: string }>;

        const out = result[0];

        if (out.res_code !== "SUCCESS") {
          return NextResponse.json(
            { error: out.res_msg, code: out.res_code },
            { status: 400 }
          );
        }

        const allocation = await prisma.requestAllocation.findUnique({
          where: { id: Number(out.alloc_id) },
          include: { request: true, listing: true, pickups: true },
        });

        // Log to MongoDB
        logAuditEvent({
          action: "ALLOCATION_TRANSACTION_SP",
          userId: user.id,
          userEmail: user.email,
          role: user.role,
          entityType: "REQUEST_ALLOCATION",
          entityId: Number(out.alloc_id),
          details: {
            mechanism: "MySQL Stored Procedure (sp_allocate_food_stock)",
            requestId: rId,
            listingId: lId,
            allocatedQuantity: allocQty,
            status: "SUCCESS",
          },
        }).catch((e) => console.error("Mongo audit error:", e));

        return NextResponse.json({
          message: out.res_msg,
          allocation,
          mechanism: "MySQL Stored Procedure (sp_allocate_food_stock)",
        }, { status: 201 });
      } catch (spError: unknown) {
        console.error("Stored procedure execution error:", spError);
        return NextResponse.json(
          { error: spError instanceof Error ? spError.message : "Stored procedure execution failed." },
          { status: 400 }
        );
      }
    }

    // --------------------------------------------------------------------------
    // PATH B: Prisma Interactive ACID Transaction (Strict Stock Over-Allocation Prevention)
    // --------------------------------------------------------------------------
    const transactionResult = await prisma.$transaction(async (tx) => {
      // 1. Fetch & validate food listing
      const listing = await tx.foodListing.findUnique({
        where: { id: lId },
      });

      if (!listing) {
        throw new Error("FOOD_LISTING_NOT_FOUND: The specified food listing does not exist.");
      }

      if (new Date(listing.expiry_date) < new Date()) {
        throw new Error("FOOD_LISTING_EXPIRED: Cannot allocate from an expired food listing.");
      }

      const availableQty = Number(listing.available_quantity);
      if (availableQty < allocQty) {
        throw new Error(
          `INSUFFICIENT_STOCK: Listing has only ${availableQty} ${listing.unit} available, but ${allocQty} was requested.`
        );
      }

      // 2. Fetch & validate food request
      const request = await tx.foodRequest.findUnique({
        where: { id: rId },
      });

      if (!request) {
        throw new Error("FOOD_REQUEST_NOT_FOUND: The specified food request does not exist.");
      }

      const requiredQty = Number(request.required_quantity);
      const fulfilledQty = Number(request.fulfilled_quantity);
      const remainingNeeded = requiredQty - fulfilledQty;

      if (remainingNeeded < allocQty) {
        throw new Error(
          `EXCEEDS_DEMAND: Request requires only ${remainingNeeded} ${request.unit}, but an allocation of ${allocQty} was attempted.`
        );
      }

      // 3. Create allocation junction record
      const allocation = await tx.requestAllocation.create({
        data: {
          request_id: rId,
          listing_id: lId,
          allocated_quantity: allocQty,
          allocation_status: AllocationStatus.RESERVED,
          allocated_by_user_id: user.id,
        },
      });

      // 4. Atomically deduct available quantity from listing
      const newListingAvail = availableQty - allocQty;
      await tx.foodListing.update({
        where: { id: lId },
        data: {
          available_quantity: newListingAvail,
          status: newListingAvail <= 0 ? ListingStatus.FULLY_ALLOCATED : ListingStatus.PARTIALLY_ALLOCATED,
        },
      });

      // 5. Atomically increment fulfilled quantity on food request
      const newReqFulfilled = fulfilledQty + allocQty;
      await tx.foodRequest.update({
        where: { id: rId },
        data: {
          fulfilled_quantity: newReqFulfilled,
          status: newReqFulfilled >= requiredQty ? RequestStatus.FULFILLED : RequestStatus.PARTIALLY_FULFILLED,
        },
      });

      // 6. Generate scheduled Pickup logistics task
      const randomOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const pickup = await tx.pickup.create({
        data: {
          allocation_id: allocation.id,
          listing_id: lId,
          pickup_time_scheduled: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
          pickup_status: PickupStatus.SCHEDULED,
          quantity_collected: allocQty,
          verification_otp: randomOtp,
        },
      });

      return { allocation, pickup, newListingAvail, newReqFulfilled };
    });

    // Asynchronously log to MongoDB
    logAuditEvent({
      action: "ALLOCATION_TRANSACTION",
      userId: user.id,
      userEmail: user.email,
      role: user.role,
      entityType: "REQUEST_ALLOCATION",
      entityId: transactionResult.allocation.id,
      details: {
        requestId: rId,
        listingId: lId,
        allocatedQuantity: allocQty,
        remainingListingStock: transactionResult.newListingAvail,
        requestFulfilledQty: transactionResult.newReqFulfilled,
      },
    }).catch((e) => console.error("Mongo audit log error:", e));

    return NextResponse.json({
      message: `Stock allocation #${transactionResult.allocation.id} created successfully and pickup scheduled.`,
      allocation: transactionResult.allocation,
      pickup: transactionResult.pickup,
      mechanism: "Prisma Interactive ACID Transaction ($transaction)",
    }, { status: 201 });
  } catch (error: unknown) {
    console.error("Allocation transaction error:", error);
    const msg = error instanceof Error ? error.message : "Allocation transaction failed.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
