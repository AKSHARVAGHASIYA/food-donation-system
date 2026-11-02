import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getMongoAuditAggregations } from "@/lib/audit";

export async function GET() {
  try {
    // 1. Fetch Aggregated Metrics from MySQL
    const [
      totalUsers,
      totalDonors,
      totalNgos,
      totalVolunteers,
      totalListings,
      totalRequests,
      totalAllocations,
      totalDistributions,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.foodDonor.count(),
      prisma.ngo.count(),
      prisma.volunteer.count(),
      prisma.foodListing.count(),
      prisma.foodRequest.count(),
      prisma.requestAllocation.count(),
      prisma.distribution.count(),
    ]);

    // Aggregate sums
    const listingTotals = await prisma.foodListing.aggregate({
      _sum: { quantity: true, available_quantity: true },
    });

    const requestTotals = await prisma.foodRequest.aggregate({
      _sum: { required_quantity: true, fulfilled_quantity: true },
    });

    const distributionTotals = await prisma.distribution.aggregate({
      _sum: { distributed_quantity: true, beneficiaries_served_count: true },
    });

    // 2. Query MySQL Views directly
    let viewsData = {
      pendingFulfillments: [] as unknown[],
      donorSummary: [] as unknown[],
      ngoStatus: [] as unknown[],
      volunteerLoad: [] as unknown[],
    };

    try {
      const [pending, donors, ngos, volunteers] = await Promise.all([
        prisma.$queryRawUnsafe("SELECT * FROM v_pending_fulfillments LIMIT 20;"),
        prisma.$queryRawUnsafe("SELECT * FROM v_donor_contribution_summary ORDER BY total_quantity_donated DESC LIMIT 20;"),
        prisma.$queryRawUnsafe("SELECT * FROM v_ngo_request_status ORDER BY total_quantity_requested DESC LIMIT 20;"),
        prisma.$queryRawUnsafe("SELECT * FROM v_volunteer_logistics_load LIMIT 20;"),
      ]);

      viewsData = {
        pendingFulfillments: pending as unknown[],
        donorSummary: donors as unknown[],
        ngoStatus: ngos as unknown[],
        volunteerLoad: volunteers as unknown[],
      };
    } catch (viewError) {
      console.warn("Could not query MySQL views directly (views may need creation):", viewError);
    }

    // 3. Query MongoDB Aggregation Pipelines
    const mongoData = await getMongoAuditAggregations();

    // Helper to safely convert BigInt values to Numbers for JSON serialization
    const serializeBigInt = (obj: any): any => {
      return JSON.parse(
        JSON.stringify(obj, (_, value) =>
          typeof value === "bigint" ? Number(value) : value
        )
      );
    };

    return NextResponse.json(
      serializeBigInt({
        summary: {
          totalUsers,
          totalDonors,
          totalNgos,
          totalVolunteers,
          totalListings,
          totalRequests,
          totalAllocations,
          totalDistributions,
          totalQuantityDonated: Number(listingTotals._sum.quantity || 0),
          totalStockAvailable: Number(listingTotals._sum.available_quantity || 0),
          totalQuantityRequested: Number(requestTotals._sum.required_quantity || 0),
          totalQuantityFulfilled: Number(requestTotals._sum.fulfilled_quantity || 0),
          totalDistributed: Number(distributionTotals._sum.distributed_quantity || 0),
          totalBeneficiariesFed: Number(distributionTotals._sum.beneficiaries_served_count || 0),
        },
        views: viewsData,
        mongoAudit: mongoData,
      })
    );
  } catch (error: unknown) {
    console.error("Analytics API error:", error);
    return NextResponse.json({ error: "Failed to generate analytics summary" }, { status: 500 });
  }
}
