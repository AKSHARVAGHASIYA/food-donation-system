import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import prisma from "./prisma";

export interface AuthUser {
  id: number;
  email: string;
  fullName: string;
  role: "ADMIN" | "DONOR" | "NGO" | "VOLUNTEER";
  status: "ACTIVE" | "PENDING_VERIFICATION" | "SUSPENDED";
  donorId?: number;
  ngoId?: number;
  volunteerId?: number;
}

const JWT_SECRET = process.env.JWT_SECRET || "btech_dbms_level3_food_donation_super_secret_jwt_key_9843";
const COOKIE_NAME = "fdms_session_token";

export async function hashPassword(plainText: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainText, salt);
}

export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

export function generateSessionToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });
}

export function verifySessionToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUser;
  } catch {
    return null;
  }
}

/**
 * Reads HTTP-only session cookie and verifies token.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = verifySessionToken(token);
    if (!payload?.id) return null;

    // Optional quick check to ensure user still exists and is ACTIVE
    const dbUser = await prisma.user.findUnique({
      where: { id: payload.id },
      include: {
        donorProfile: true,
        ngoProfile: true,
        volunteerProfile: true,
      },
    });

    if (!dbUser || dbUser.status === "SUSPENDED") {
      return null;
    }

    return {
      id: dbUser.id,
      email: dbUser.email,
      fullName: dbUser.full_name,
      role: dbUser.role as "ADMIN" | "DONOR" | "NGO" | "VOLUNTEER",
      status: dbUser.status as "ACTIVE" | "PENDING_VERIFICATION" | "SUSPENDED",
      donorId: dbUser.donorProfile?.id,
      ngoId: dbUser.ngoProfile?.id,
      volunteerId: dbUser.volunteerProfile?.id,
    };
  } catch {
    return null;
  }
}

/**
 * Server-side authorization guard.
 * Throws an Error or returns user if role is allowed.
 */
export async function requireAuth(allowedRoles?: Array<"ADMIN" | "DONOR" | "NGO" | "VOLUNTEER">): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED: Authentication required to access this resource.");
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    throw new Error(`FORBIDDEN: Access restricted. Required role: ${allowedRoles.join(" or ")}`);
  }

  return user;
}

export { COOKIE_NAME };
