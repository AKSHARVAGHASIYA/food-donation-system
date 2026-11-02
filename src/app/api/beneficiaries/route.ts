import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { VulnerabilityType } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ngoId = searchParams.get("ngoId");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (ngoId) {
      where.ngo_id = parseInt(ngoId, 10);
    }

    const groups = await prisma.beneficiaryGroup.findMany({
      where,
      include: {
        ngo: { select: { ngo_name: true } },
        _count: { select: { requests: true, distributions: true } },
      },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({ groups });
  } catch (error: unknown) {
    console.error("Fetch beneficiaries error:", error);
    return NextResponse.json({ error: "Failed to fetch beneficiary groups" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (user.role !== "NGO" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only NGOs or Admins can register beneficiary groups" }, { status: 403 });
    }

    const body = await req.json();
    let ngoId = user.ngoId;
    if (user.role === "ADMIN" && body.ngo_id) {
      ngoId = parseInt(body.ngo_id, 10);
    }

    if (!ngoId) {
      return NextResponse.json({ error: "NGO profile required" }, { status: 400 });
    }

    const { group_name, location, target_headcount, vulnerability_type, contact_representative, notes } = body;

    if (!group_name || !location || !target_headcount) {
      return NextResponse.json({ error: "Group name, location, and headcount are required" }, { status: 400 });
    }

    const headcount = parseInt(target_headcount, 10);
    if (isNaN(headcount) || headcount <= 0) {
      return NextResponse.json({ error: "Target headcount must be greater than 0" }, { status: 400 });
    }

    const group = await prisma.beneficiaryGroup.create({
      data: {
        ngo_id: ngoId,
        group_name: group_name.trim(),
        location: location.trim(),
        target_headcount: headcount,
        vulnerability_type: vulnerability_type as VulnerabilityType || "LOW_INCOME_COMMUNITY",
        contact_representative: contact_representative ? contact_representative.trim() : null,
        notes: notes ? notes.trim() : null,
      },
    });

    return NextResponse.json({ message: "Beneficiary group created", group }, { status: 201 });
  } catch (error: unknown) {
    console.error("Create beneficiary error:", error);
    return NextResponse.json({ error: "Failed to create beneficiary group" }, { status: 500 });
  }
}
