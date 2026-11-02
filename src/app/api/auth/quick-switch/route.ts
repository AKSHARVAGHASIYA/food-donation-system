import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateSessionToken, COOKIE_NAME } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { UserRole } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const { role } = await req.json();

    if (!role || !Object.values(UserRole).includes(role)) {
      return NextResponse.json(
        { error: `Invalid role specified. Supported: ${Object.values(UserRole).join(", ")}` },
        { status: 400 }
      );
    }

    // Find the first active user for this role
    const user = await prisma.user.findFirst({
      where: { role: role as UserRole, status: "ACTIVE" },
      include: {
        donorProfile: true,
        ngoProfile: true,
        volunteerProfile: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: `No active user found with role ${role}` },
        { status: 404 }
      );
    }

    const authPayload = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      status: user.status,
      donorId: user.donorProfile?.id,
      ngoId: user.ngoProfile?.id,
      volunteerId: user.volunteerProfile?.id,
    };

    const token = generateSessionToken(authPayload);

    logAuditEvent({
      action: "QUICK_ROLE_SWITCH",
      userId: user.id,
      userEmail: user.email,
      role: user.role,
      entityType: "USER",
      entityId: user.id,
      details: { roleSwitchedTo: role },
    }).catch((e) => console.error("Mongo audit log error:", e));

    const response = NextResponse.json({
      message: `Switched session to ${role} (${user.email})`,
      user: authPayload,
    });

    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error: unknown) {
    console.error("Quick switch error:", error);
    return NextResponse.json({ error: "Role switch failed" }, { status: 500 });
  }
}
