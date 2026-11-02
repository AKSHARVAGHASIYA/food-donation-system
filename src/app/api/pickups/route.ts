import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { PickupStatus } from "@prisma/client";

// GET /api/pickups - Fetch pickups
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const volunteerId = searchParams.get("volunteerId");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (status && Object.values(PickupStatus).includes(status as PickupStatus)) {
      where.pickup_status = status as PickupStatus;
    }
    if (volunteerId) {
      where.volunteer_id = parseInt(volunteerId, 10);
    }

    const pickups = await prisma.pickup.findMany({
      where,
      include: {
        listing: {
          include: {
            donor: {
              include: { user: { select: { full_name: true, phone: true } } },
            },
          },
        },
        allocation: {
          include: {
            request: {
              include: {
                ngo: { select: { ngo_name: true, contact_person: true } },
                beneficiaryGroup: true,
              },
            },
          },
        },
        volunteer: {
          include: { user: { select: { full_name: true, phone: true } } },
        },
      },
      orderBy: { pickup_time_scheduled: "asc" },
    });

    return NextResponse.json({ pickups });
  } catch (error: unknown) {
    console.error("Fetch pickups error:", error);
    return NextResponse.json({ error: "Failed to fetch pickups" }, { status: 500 });
  }
}

// PATCH /api/pickups - Update pickup status, volunteer assignment, verification OTP
export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const { pickupId, newStatus, volunteerId, otp, donorSignature, notes, quantityCollected } = body;

    const pId = parseInt(pickupId, 10);
    if (isNaN(pId)) {
      return NextResponse.json({ error: "Valid pickupId is required" }, { status: 400 });
    }

    const pickup = await prisma.pickup.findUnique({
      where: { id: pId },
      include: { allocation: true },
    });

    if (!pickup) {
      return NextResponse.json({ error: "Pickup record not found" }, { status: 404 });
    }

    // Role verification: Volunteers can only modify pickups assigned to them or assign themselves
    let assignedVolId = pickup.volunteer_id;
    if (user.role === "VOLUNTEER") {
      if (!user.volunteerId) {
        return NextResponse.json({ error: "Volunteer profile not found" }, { status: 403 });
      }

      if (pickup.volunteer_id && pickup.volunteer_id !== user.volunteerId) {
        return NextResponse.json(
          { error: "Forbidden: This pickup is assigned to another volunteer" },
          { status: 403 }
        );
      }
      assignedVolId = user.volunteerId;
    } else if (volunteerId) {
      assignedVolId = parseInt(volunteerId, 10);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};

    if (newStatus && Object.values(PickupStatus).includes(newStatus as PickupStatus)) {
      updateData.pickup_status = newStatus as PickupStatus;
      if (newStatus === "PICKED_UP" && !pickup.actual_pickup_time) {
        updateData.actual_pickup_time = new Date();
      }
    }

    if (assignedVolId !== undefined) {
      updateData.volunteer_id = assignedVolId;
    }

    if (donorSignature) updateData.donor_signature_name = donorSignature.trim();
    if (notes) updateData.notes = notes.trim();
    if (quantityCollected) updateData.quantity_collected = parseFloat(quantityCollected);

    // If OTP verification supplied
    if (otp && pickup.verification_otp && otp !== pickup.verification_otp) {
      return NextResponse.json({ error: "Verification Failed: Incorrect OTP entered." }, { status: 400 });
    }

    const updated = await prisma.pickup.update({
      where: { id: pId },
      data: updateData,
      include: {
        volunteer: { include: { user: { select: { full_name: true } } } },
      },
    });

    // Also update request_allocation status if picked up or delivered
    if (newStatus === "PICKED_UP" || newStatus === "EN_ROUTE_TO_PICKUP") {
      await prisma.requestAllocation.update({
        where: { id: pickup.allocation_id },
        data: { allocation_status: "DISPATCHED" },
      });
    } else if (newStatus === "DELIVERED_TO_HUB") {
      await prisma.requestAllocation.update({
        where: { id: pickup.allocation_id },
        data: { allocation_status: "DELIVERED" },
      });
    }

    // Log to MongoDB
    logAuditEvent({
      action: "PICKUP_STATUS_UPDATED",
      userId: user.id,
      userEmail: user.email,
      role: user.role,
      entityType: "PICKUP",
      entityId: pId,
      details: {
        oldStatus: pickup.pickup_status,
        newStatus: updateData.pickup_status || pickup.pickup_status,
        volunteerId: assignedVolId,
      },
    }).catch((e) => console.error("Mongo audit log error:", e));

    return NextResponse.json({
      message: "Pickup updated successfully",
      pickup: updated,
    });
  } catch (error: unknown) {
    console.error("Update pickup error:", error);
    return NextResponse.json({ error: "Failed to update pickup" }, { status: 500 });
  }
}
