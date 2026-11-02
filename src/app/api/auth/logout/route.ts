import { NextResponse } from "next/server";
import { getCurrentUser, COOKIE_NAME } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

export async function POST() {
  try {
    const user = await getCurrentUser();

    if (user) {
      logAuditEvent({
        action: "USER_LOGOUT",
        userId: user.id,
        userEmail: user.email,
        role: user.role,
        entityType: "USER",
        entityId: user.id,
        details: { logoutTime: new Date().toISOString() },
      }).catch((e) => console.error("Mongo audit log error:", e));
    }

    const response = NextResponse.json({ message: "Logged out successfully" });

    response.cookies.set({
      name: COOKIE_NAME,
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error: unknown) {
    console.error("Logout error:", error);
    return NextResponse.json({ error: "Failed to logout" }, { status: 500 });
  }
}
