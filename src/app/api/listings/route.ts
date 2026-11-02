import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { FoodCategory, FoodUnit, DietaryType, StorageRequirement, ListingStatus } from "@prisma/client";

// GET /api/listings - Retrieve listings with filters and search
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const city = searchParams.get("city");
    const search = searchParams.get("search");
    const donorId = searchParams.get("donorId");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = {};

    if (category && Object.values(FoodCategory).includes(category as FoodCategory)) {
      whereClause.food_category = category as FoodCategory;
    }

    if (status && Object.values(ListingStatus).includes(status as ListingStatus)) {
      whereClause.status = status as ListingStatus;
    }

    if (city) {
      whereClause.city = { contains: city };
    }

    if (donorId) {
      whereClause.donor_id = parseInt(donorId, 10);
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search } },
        { special_notes: { contains: search } },
        { pickup_address: { contains: search } },
      ];
    }

    const listings = await prisma.foodListing.findMany({
      where: whereClause,
      include: {
        donor: {
          include: {
            user: {
              select: { full_name: true, email: true, phone: true },
            },
          },
        },
        _count: {
          select: { allocations: true, pickups: true },
        },
      },
      orderBy: [{ status: "asc" }, { expiry_date: "asc" }],
    });

    return NextResponse.json({ listings });
  } catch (error: unknown) {
    console.error("Fetch listings error:", error);
    return NextResponse.json({ error: "Failed to fetch food listings" }, { status: 500 });
  }
}

// POST /api/listings - Create new food listing
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (user.role !== "DONOR" && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only Donors or Admins can create food listings" },
        { status: 403 }
      );
    }

    let donorId = user.donorId;
    const body = await req.json();

    // If Admin is posting on behalf of a specific donor
    if (user.role === "ADMIN" && body.donor_id) {
      donorId = parseInt(body.donor_id, 10);
    }

    if (!donorId) {
      return NextResponse.json(
        { error: "Donor profile not found for this user account" },
        { status: 400 }
      );
    }

    const {
      title,
      food_category,
      quantity,
      unit = "MEALS",
      expiry_date,
      dietary_type = "VEGETARIAN",
      storage_requirement = "ROOM_TEMPERATURE",
      pickup_address,
      city,
      special_notes,
    } = body;

    // Server-side validation
    if (!title || !food_category || !quantity || !expiry_date || !pickup_address || !city) {
      return NextResponse.json(
        { error: "Missing required fields: title, category, quantity, expiry date, address, and city are mandatory." },
        { status: 400 }
      );
    }

    const parsedQty = parseFloat(quantity);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      return NextResponse.json(
        { error: "Validation Error: Quantity must be a positive number greater than 0." },
        { status: 400 }
      );
    }

    const parsedExpiry = new Date(expiry_date);
    if (isNaN(parsedExpiry.getTime()) || parsedExpiry <= new Date()) {
      return NextResponse.json(
        { error: "Validation Error: Expiry date must be a valid future date and time." },
        { status: 400 }
      );
    }

    const newListing = await prisma.foodListing.create({
      data: {
        donor_id: donorId,
        title: title.trim(),
        food_category: food_category as FoodCategory,
        quantity: parsedQty,
        available_quantity: parsedQty,
        unit: unit as FoodUnit,
        expiry_date: parsedExpiry,
        dietary_type: dietary_type as DietaryType,
        storage_requirement: storage_requirement as StorageRequirement,
        status: ListingStatus.AVAILABLE,
        pickup_address: pickup_address.trim(),
        city: city.trim(),
        special_notes: special_notes ? special_notes.trim() : null,
      },
    });

    // Asynchronously log to MongoDB
    logAuditEvent({
      action: "DONATION_CREATED",
      userId: user.id,
      userEmail: user.email,
      role: user.role,
      entityType: "FOOD_LISTING",
      entityId: newListing.id,
      details: {
        title: newListing.title,
        quantity: parsedQty,
        category: food_category,
        unit,
      },
    }).catch((e) => console.error("Mongo audit log error:", e));

    return NextResponse.json({
      message: "Food listing created successfully",
      listing: newListing,
    }, { status: 201 });
  } catch (error: unknown) {
    console.error("Create listing error:", error);
    return NextResponse.json({ error: "Failed to create food listing" }, { status: 500 });
  }
}
