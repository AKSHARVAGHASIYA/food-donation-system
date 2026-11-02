import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    // 1. Fetch pending requests
    const pendingRequests = await prisma.foodRequest.findMany({
      where: {
        status: { in: ["PENDING", "PARTIALLY_FULFILLED"] },
      },
      include: {
        ngo: { select: { ngo_name: true, contact_person: true } },
        beneficiaryGroup: true,
      },
      orderBy: [{ urgency_level: "desc" }, { needed_by: "asc" }],
    });

    // 2. Fetch available listings with positive stock and future expiry
    const availableListings = await prisma.foodListing.findMany({
      where: {
        status: { in: ["AVAILABLE", "PARTIALLY_ALLOCATED"] },
        available_quantity: { gt: 0 },
        expiry_date: { gt: new Date() },
      },
      include: {
        donor: {
          include: {
            user: { select: { full_name: true, phone: true } },
          },
        },
      },
      orderBy: { expiry_date: "asc" },
    });

    // 3. Compute smart matching matrix
    const matches: Array<{
      requestId: number;
      requestTitle: string;
      ngoName: string;
      requestedCategory: string;
      neededQuantity: number;
      unit: string;
      urgency: string;
      city: string;
      beneficiaryTarget?: string;
      candidates: Array<{
        listingId: number;
        listingTitle: string;
        donorName: string;
        donorOrg?: string | null;
        availableQuantity: number;
        unit: string;
        expiryDate: string;
        hoursUntilExpiry: number;
        city: string;
        matchQuantity: number;
        isExactCategory: boolean;
        isCityMatch: boolean;
        score: number;
      }>;
    }> = [];

    const now = Date.now();

    for (const req of pendingRequests) {
      const remainingNeeded = Number(req.required_quantity) - Number(req.fulfilled_quantity);
      if (remainingNeeded <= 0) continue;

      const candidates = [];

      for (const listing of availableListings) {
        const availQty = Number(listing.available_quantity);
        const isExactCategory = listing.food_category === req.requested_food_category;
        const isCityMatch =
          !req.city ||
          !listing.city ||
          req.city.toLowerCase() === listing.city.toLowerCase();

        if (isExactCategory) {
          const hoursUntilExpiry = Math.max(
            0,
            Math.round((new Date(listing.expiry_date).getTime() - now) / (1000 * 60 * 60))
          );

          const matchQty = Math.min(remainingNeeded, availQty);

          // Scoring heuristic:
          // Higher urgency = higher score
          // Closer expiry = prioritize before waste
          // Same city = bonus score
          let score = 50;
          if (req.urgency_level === "CRITICAL") score += 30;
          else if (req.urgency_level === "HIGH") score += 20;
          else if (req.urgency_level === "MEDIUM") score += 10;

          if (isCityMatch) score += 15;
          if (hoursUntilExpiry <= 24) score += 25; // Expiring soon, prioritize!
          else if (hoursUntilExpiry <= 48) score += 15;

          candidates.push({
            listingId: listing.id,
            listingTitle: listing.title,
            donorName: listing.donor.user.full_name,
            donorOrg: listing.donor.organization_name,
            availableQuantity: availQty,
            unit: listing.unit,
            expiryDate: listing.expiry_date.toISOString(),
            hoursUntilExpiry,
            city: listing.city,
            matchQuantity: matchQty,
            isExactCategory,
            isCityMatch,
            score,
          });
        }
      }

      // Sort candidates by match score descending
      candidates.sort((a, b) => b.score - a.score);

      matches.push({
        requestId: req.id,
        requestTitle: `${req.requested_food_category} for ${req.ngo.ngo_name}`,
        ngoName: req.ngo.ngo_name,
        requestedCategory: req.requested_food_category,
        neededQuantity: remainingNeeded,
        unit: req.unit,
        urgency: req.urgency_level,
        city: req.city,
        beneficiaryTarget: req.beneficiaryGroup?.group_name,
        candidates,
      });
    }

    return NextResponse.json({
      totalPendingRequests: pendingRequests.length,
      totalAvailableListings: availableListings.length,
      matches,
    });
  } catch (error: unknown) {
    console.error("Food matching algorithm error:", error);
    return NextResponse.json({ error: "Failed to run food matching algorithm" }, { status: 500 });
  }
}
