import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { FoodCategory, FoodUnit, RequestUrgency, RequestStatus } from "@prisma/client";

// GET /api/requests - Fetch food requests with filters
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const urgency = searchParams.get("urgency");
    const ngoId = searchParams.get("ngoId");
    const city = searchParams.get("city");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = {};

    if (category && Object.values(FoodCategory).includes(category as FoodCategory)) {
      whereClause.requested_food_category = category as FoodCategory;
    }

    if (status && Object.values(RequestStatus).includes(status as RequestStatus)) {
      whereClause.status = status as RequestStatus;
    }

    if (urgency && Object.values(RequestUrgency).includes(urgency as RequestUrgency)) {
      whereClause.urgency_level = urgency as RequestUrgency;
    }

    if (ngoId) {
      whereClause.ngo_id = parseInt(ngoId, 10);
    }

    if (city) {
      whereClause.city = { contains: city };
    }

    const requests = await prisma.foodRequest.findMany({
      where: whereClause,
      include: {
        ngo: {
          include: {
            user: { select: { full_name: true, email: true, phone: true } },
          },
        },
        beneficiaryGroup: true,
        allocations: {
          include: {
            listing: { select: { id: true, title: true, unit: true, food_category: true } },
          },
        },
      },
      orderBy: [
        {
          urgency_level: "desc",
        },
        { needed_by: "asc" },
      ],
    });

    return NextResponse.json({ requests });
  } catch (error: unknown) {
    console.error("Fetch requests error:", error);
    return NextResponse.json({ error: "Failed to fetch food requests" }, { status: 500 });
  }
}

// POST /api/requests - Submit a new food request
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (user.role !== "NGO" && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only NGOs or Admins can submit food requests" },
        { status: 403 }
      );
    }

    let ngoId = user.ngoId;
    const body = await req.json();

    if (user.role === "ADMIN" && body.ngo_id) {
      ngoId = parseInt(body.ngo_id, 10);
    }

    if (!ngoId) {
      return NextResponse.json({ error: "NGO profile not found for this user account" }, { status: 400 });
    }

    const {
      requested_food_category,
      required_quantity,
      unit = "MEALS",
      urgency_level = "MEDIUM",
      needed_by,
      delivery_address,
      city,
      beneficiary_group_id,
      notes,
    } = body;

    // Server-side input validation
    if (!requested_food_category || !required_quantity || !needed_by || !delivery_address || !city) {
      return NextResponse.json(
        { error: "Missing required fields: food category, required quantity, deadline, delivery address, and city are mandatory." },
        { status: 400 }
      );
    }

    const parsedQty = parseFloat(required_quantity);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      return NextResponse.json(
        { error: "Validation Error: Required quantity must be a positive number greater than 0." },
        { status: 400 }
      );
    }

    const parsedNeededBy = new Date(needed_by);
    if (isNaN(parsedNeededBy.getTime()) || parsedNeededBy <= new Date()) {
      return NextResponse.json(
        { error: "Validation Error: Needed by deadline must be a valid future date and time." },
        { status: 400 }
      );
    }

    const newRequest = await prisma.foodRequest.create({
      data: {
        ngo_id: ngoId,
        beneficiary_group_id: beneficiary_group_id ? parseInt(beneficiary_group_id, 10) : null,
        requested_food_category: requested_food_category as FoodCategory,
        required_quantity: parsedQty,
        fulfilled_quantity: 0.0,
        unit: unit as FoodUnit,
        urgency_level: urgency_level as RequestUrgency,
        status: RequestStatus.PENDING,
        needed_by: parsedNeededBy,
        delivery_address: delivery_address.trim(),
        city: city.trim(),
        notes: notes ? notes.trim() : null,
      },
      include: {
        beneficiaryGroup: true,
      },
    });

    logAuditEvent({
      action: "REQUEST_SUBMITTED",
      userId: user.id,
      userEmail: user.email,
      role: user.role,
      entityType: "FOOD_REQUEST",
      entityId: newRequest.id,
      details: {
        quantity: parsedQty,
        category: requested_food_category,
        urgency: urgency_level,
      },
    }).catch((e) => console.error("Mongo audit log error:", e));

    return NextResponse.json({
      message: "Food request submitted successfully",
      request: newRequest,
    }, { status: 201 });
  } catch (error: unknown) {
    console.error("Create request error:", error);
    return NextResponse.json({ error: "Failed to submit food request" }, { status: 500 });
  }
}
