import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPassword, generateSessionToken, COOKIE_NAME } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        donorProfile: true,
        ngoProfile: true,
        volunteerProfile: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    if (user.status === "SUSPENDED") {
      return NextResponse.json(
        { error: "This account has been suspended. Please contact the administrator." },
        { status: 403 }
      );
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
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

    // Asynchronously log audit event to MongoDB
    logAuditEvent({
      action: "USER_LOGIN",
      userId: user.id,
      userEmail: user.email,
      role: user.role,
      entityType: "USER",
      entityId: user.id,
      details: {
        loginTime: new Date().toISOString(),
        role: user.role,
      },
    }).catch((e) => console.error("Mongo audit log error:", e));

    const response = NextResponse.json({
      message: "Login successful",
      user: authPayload,
    });

    // Set HTTP-only session cookie
    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error: unknown) {
    console.error("Login API error:", error);
    return NextResponse.json(
      { error: "Internal server error occurred." },
      { status: 500 }
    );
  }
}
