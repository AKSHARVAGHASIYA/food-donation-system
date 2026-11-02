import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { DistributionStatus } from "@prisma/client";

// GET /api/distributions - Fetch distributions
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ngoId = searchParams.get("ngoId");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (ngoId) {
      where.ngo_id = parseInt(ngoId, 10);
    }

    const distributions = await prisma.distribution.findMany({
      where,
      include: {
        ngo: { select: { ngo_name: true, contact_person: true } },
        beneficiaryGroup: true,
        allocation: {
          include: {
            listing: { select: { title: true, unit: true, food_category: true } },
            request: { select: { id: true, requested_food_category: true } },
          },
        },
      },
      orderBy: { distribution_date: "desc" },
    });

    return NextResponse.json({ distributions });
  } catch (error: unknown) {
    console.error("Fetch distributions error:", error);
    return NextResponse.json({ error: "Failed to fetch distributions" }, { status: 500 });
  }
}

// POST /api/distributions - Log distribution completion
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (user.role !== "NGO" && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only NGOs or Admins can record distributions" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      allocation_id,
      beneficiary_group_id,
      distributed_quantity,
      beneficiaries_served_count,
      received_by_person,
      verification_signature,
      feedback_notes,
    } = body;

    const allocId = parseInt(allocation_id, 10);
    const qty = parseFloat(distributed_quantity);
    const servedCount = parseInt(beneficiaries_served_count, 10);

    if (isNaN(allocId) || isNaN(qty) || qty <= 0 || isNaN(servedCount) || servedCount <= 0 || !received_by_person) {
      return NextResponse.json(
        { error: "Allocation ID, valid distributed quantity, positive beneficiary count, and recipient name are required." },
        { status: 400 }
      );
    }

    const allocation = await prisma.requestAllocation.findUnique({
      where: { id: allocId },
      include: { request: true },
    });

    if (!allocation) {
      return NextResponse.json({ error: "Allocation not found" }, { status: 404 });
    }

    const ngoId = allocation.request.ngo_id;
    if (user.role === "NGO" && user.ngoId && user.ngoId !== ngoId) {
      return NextResponse.json({ error: "Forbidden: Cannot record distribution for another NGO's allocation" }, { status: 403 });
    }

    const distribution = await prisma.distribution.create({
      data: {
        allocation_id: allocId,
        ngo_id: ngoId,
        beneficiary_group_id: beneficiary_group_id ? parseInt(beneficiary_group_id, 10) : allocation.request.beneficiary_group_id,
        distribution_date: new Date(),
        distributed_quantity: qty,
        beneficiaries_served_count: servedCount,
        distribution_status: DistributionStatus.DISTRIBUTED,
        received_by_person: received_by_person.trim(),
        verification_signature: verification_signature ? verification_signature.trim() : null,
        feedback_notes: feedback_notes ? feedback_notes.trim() : null,
      },
    });

    logAuditEvent({
      action: "DISTRIBUTION_RECORDED",
      userId: user.id,
      userEmail: user.email,
      role: user.role,
      entityType: "DISTRIBUTION",
      entityId: distribution.id,
      details: {
        allocationId: allocId,
        distributedQuantity: qty,
        beneficiariesServed: servedCount,
      },
    }).catch((e) => console.error("Mongo audit log error:", e));

    return NextResponse.json({
      message: "Distribution logged successfully",
      distribution,
    }, { status: 201 });
  } catch (error: unknown) {
    console.error("Record distribution error:", error);
    return NextResponse.json({ error: "Failed to record distribution" }, { status: 500 });
  }
}
