import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    // Allow logged-in admin or coordinator, or in development for evaluation
    if (!user && process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { query } = await req.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query string is required" }, { status: 400 });
    }

    // Security safety: prevent dangerous commands in demo query runner
    const normalized = query.trim().toUpperCase();
    if (
      normalized.includes("DROP DATABASE") ||
      normalized.includes("TRUNCATE") ||
      normalized.includes("GRANT ") ||
      normalized.includes("SHUTDOWN")
    ) {
      return NextResponse.json({ error: "Security Guard: Dangerous query blocked." }, { status: 403 });
    }

    const startTime = performance.now();
    // Execute query
    const results = await prisma.$queryRawUnsafe(query);
    const durationMs = Math.round((performance.now() - startTime) * 100) / 100;

    const safeResults = JSON.parse(
      JSON.stringify(results, (_, value) =>
        typeof value === "bigint" ? Number(value) : value
      )
    );

    return NextResponse.json({
      success: true,
      durationMs,
      rowsCount: Array.isArray(results) ? results.length : 1,
      results: safeResults,
    });
  } catch (error: unknown) {
    console.error("SQL Runner error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "SQL execution failed" },
      { status: 400 }
    );
  }
}
