import { getMongoDb } from "./mongodb";

export interface AuditLogEntry {
  action: string; // e.g. "USER_LOGIN", "CREATE_LISTING", "ALLOCATION_TRANSACTION", "PICKUP_STATUS_UPDATE", "DISTRIBUTION_RECORDED"
  userId?: number;
  userEmail?: string;
  role?: string;
  entityType?: "USER" | "FOOD_DONOR" | "FOOD_LISTING" | "NGO" | "FOOD_REQUEST" | "REQUEST_ALLOCATION" | "VOLUNTEER" | "PICKUP" | "DISTRIBUTION" | "BENEFICIARY_GROUP" | "SYSTEM";
  entityId?: number | string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  timestamp?: Date;
}

/**
 * Persists an audit event to MongoDB collection `audit_events`.
 * Indexes: { action: 1 }, { timestamp: -1 }, { entityType: 1 }
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    const db = await getMongoDb();
    const collection = db.collection("audit_events");

    await collection.insertOne({
      ...entry,
      timestamp: entry.timestamp || new Date(),
    });
  } catch (err) {
    console.error("[MongoDB Audit Logger Error]: Failed to persist audit log entry:", err);
  }
}

/**
 * Demonstrates advanced MongoDB Aggregation Pipelines:
 * 1. Action frequencies & latest event time ($group, $sort, $limit)
 * 2. Role-based activity distribution ($group)
 * 3. Daily activity timeline ($group by year-month-day)
 */
export async function getMongoAuditAggregations() {
  try {
    const db = await getMongoDb();
    const collection = db.collection("audit_events");

    // Aggregation Pipeline 1: Group by Action Type with counts and latest timestamp
    const actionStats = await collection
      .aggregate([
        {
          $group: {
            _id: "$action",
            count: { $sum: 1 },
            latestActivity: { $max: "$timestamp" },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ])
      .toArray();

    // Aggregation Pipeline 2: Group by Role distribution
    const roleStats = await collection
      .aggregate([
        {
          $group: {
            _id: { $ifNull: ["$role", "SYSTEM"] },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ])
      .toArray();

    // Aggregation Pipeline 3: Daily Activity Trends using $dateToString
    const dailyActivity = await collection
      .aggregate([
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$timestamp" },
            },
            totalEvents: { $sum: 1 },
            uniqueUsers: { $addToSet: "$userEmail" },
          },
        },
        {
          $project: {
            date: "$_id",
            totalEvents: 1,
            userCount: { $size: "$uniqueUsers" },
          },
        },
        { $sort: { _id: 1 } },
        { $limit: 14 },
      ])
      .toArray();

    // Aggregation Pipeline 4: Recent 25 raw logs
    const recentLogs = await collection
      .find({})
      .sort({ timestamp: -1 })
      .limit(25)
      .toArray();

    return {
      status: "connected",
      actionStats,
      roleStats,
      dailyActivity,
      recentLogs: recentLogs.map((log) => ({
        ...log,
        _id: log._id.toString(),
      })),
    };
  } catch (err: unknown) {
    console.error("[MongoDB Aggregation Pipeline Error]:", err);
    return {
      status: "error",
      error: err instanceof Error ? err.message : "MongoDB connection failed",
      actionStats: [],
      roleStats: [],
      dailyActivity: [],
      recentLogs: [],
    };
  }
}
