"use client";

import React, { useState, useEffect } from "react";
import {
  Database,
  Play,
  Eye,
  Workflow,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Terminal,
} from "lucide-react";

const DEMO_QUERIES = [
  {
    id: "q1",
    title: "1. Multi-Table JOIN with GROUP BY, HAVING & Aggregates",
    description: "Analyzes cumulative donor metrics (SUM, AVG, MIN, MAX) filtering only donors with >= 20 units donated.",
    sql: `SELECT 
    fd.id AS donor_id,
    u.full_name AS donor_name,
    fd.donor_type,
    fd.organization_name,
    COUNT(fl.id) AS total_listings,
    COALESCE(SUM(fl.quantity), 0) AS total_donated_qty,
    COALESCE(AVG(fl.quantity), 0) AS avg_listing_qty,
    COALESCE(MIN(fl.quantity), 0) AS min_batch_qty,
    COALESCE(MAX(fl.quantity), 0) AS max_batch_qty,
    COALESCE(SUM(fl.available_quantity), 0) AS current_unallocated_stock
FROM food_donors fd
INNER JOIN users u ON fd.user_id = u.id
LEFT JOIN food_listings fl ON fd.id = fl.donor_id
GROUP BY fd.id, u.full_name, fd.donor_type, fd.organization_name
HAVING total_listings > 0 AND total_donated_qty >= 20.00
ORDER BY total_donated_qty DESC, total_listings DESC;`,
  },
  {
    id: "q2",
    title: "2. Correlated Subquery with Aggregate Comparison",
    description: "Finds listings whose available quantity is strictly greater than the average available quantity of their food category.",
    sql: `SELECT 
    fl1.id AS listing_id,
    fl1.title,
    fl1.food_category,
    fl1.available_quantity,
    fl1.unit,
    fl1.city,
    fl1.expiry_date,
    (
        SELECT ROUND(AVG(fl2.available_quantity), 2)
        FROM food_listings fl2
        WHERE fl2.food_category = fl1.food_category
          AND fl2.status = 'AVAILABLE'
    ) AS category_avg_available
FROM food_listings fl1
WHERE fl1.status = 'AVAILABLE'
  AND fl1.available_quantity > (
      SELECT AVG(fl2.available_quantity)
      FROM food_listings fl2
      WHERE fl2.food_category = fl1.food_category
        AND fl2.status = 'AVAILABLE'
  )
ORDER BY fl1.food_category, fl1.available_quantity DESC;`,
  },
  {
    id: "q3",
    title: "3. 5-Table Traceability via Junction Table",
    description: "End-to-end traceability linking donor listing -> request allocation -> volunteer pickup -> NGO distribution -> beneficiary group.",
    sql: `SELECT 
    ra.id AS allocation_id,
    ra.allocated_quantity,
    ra.allocation_status,
    fl.title AS food_title,
    u_donor.full_name AS donor_name,
    n.ngo_name,
    COALESCE(bg.group_name, 'Direct Shelter Distribution') AS beneficiary_target,
    COALESCE(u_vol.full_name, 'Unassigned / Direct') AS volunteer_name,
    p.pickup_status,
    d.distribution_status,
    COALESCE(d.beneficiaries_served_count, 0) AS people_fed
FROM request_allocations ra
INNER JOIN food_listings fl ON ra.listing_id = fl.id
INNER JOIN food_donors fd ON fl.donor_id = fd.id
INNER JOIN users u_donor ON fd.user_id = u_donor.id
INNER JOIN food_requests fr ON ra.request_id = fr.id
INNER JOIN ngos n ON fr.ngo_id = n.id
LEFT JOIN beneficiary_groups bg ON fr.beneficiary_group_id = bg.id
LEFT JOIN pickups p ON ra.id = p.allocation_id
LEFT JOIN volunteers v ON p.volunteer_id = v.id
LEFT JOIN users u_vol ON v.user_id = u_vol.id
LEFT JOIN distributions d ON ra.id = d.allocation_id
ORDER BY ra.allocated_at DESC;`,
  },
  {
    id: "q4",
    title: "4. Querying View: v_ngo_request_status",
    description: "Direct query on database view computing fulfillment rates and demand fulfillment metrics.",
    sql: `SELECT * FROM v_ngo_request_status ORDER BY total_quantity_requested DESC;`,
  },
];

export default function AnalyticsPage() {
  const [activeSection, setActiveSection] = useState<"SQL_RUNNER" | "VIEWS" | "PROCEDURES" | "MONGO_AUDIT">("SQL_RUNNER");

  // SQL Runner state
  const [selectedDemo, setSelectedDemo] = useState(DEMO_QUERIES[0].id);
  const [customSql, setCustomSql] = useState(DEMO_QUERIES[0].sql);
  const [queryExecuting, setQueryExecuting] = useState(false);
  const [queryResult, setQueryResult] = useState<{ durationMs?: number; rowsCount?: number; results?: Record<string, unknown>[]; error?: string } | null>(null);

  // Views & Mongo state
  const [analyticsData, setAnalyticsData] = useState<Record<string, any> | null>(null);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch("/api/analytics");
      if (res.ok) {
        const d = await res.json();
        setAnalyticsData(d);
      }
    } catch (e) {
      console.error("Fetch analytics error:", e);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleSelectQuery = (id: string) => {
    setSelectedDemo(id);
    const q = DEMO_QUERIES.find((item) => item.id === id);
    if (q) {
      setCustomSql(q.sql);
      setQueryResult(null);
    }
  };

  const handleExecuteSql = async () => {
    setQueryExecuting(true);
    setQueryResult(null);

    try {
      const res = await fetch("/api/analytics/sql-runner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: customSql }),
      });

      const data = await res.json();
      if (!res.ok) {
        setQueryResult({ error: data.error || "Query execution failed" });
      } else {
        setQueryResult(data);
      }
    } catch (e) {
      setQueryResult({ error: "Failed to communicate with SQL runner endpoint." });
    } finally {
      setQueryExecuting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 text-xs font-semibold text-purple-600 uppercase tracking-wider">
          <Database className="w-4 h-4" />
          <span>Advanced DBMS Academic Criteria & Verification</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
          Relational SQL & MongoDB Event Analytics
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Live verification console for transactions, 4 database views, stored procedures, triggers, complex analytical queries, and MongoDB aggregation pipelines.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 text-xs">
        {[
          { key: "SQL_RUNNER", label: "Live SQL Query Runner", icon: Terminal },
          { key: "VIEWS", label: "Database Views (4)", icon: Eye },
          { key: "PROCEDURES", label: "Procedures & Triggers", icon: Workflow },
          { key: "MONGO_AUDIT", label: "MongoDB Aggregations", icon: BarChart3 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveSection(tab.key as any)}
              className={`flex items-center space-x-1.5 py-2.5 px-4 font-semibold border-b-2 cursor-pointer transition-all ${
                isActive
                  ? "border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-lg"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SECTION 1: LIVE SQL QUERY RUNNER */}
      {activeSection === "SQL_RUNNER" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center">
                  <Terminal className="w-4 h-4 mr-2 text-emerald-600" />
                  Live Academic SQL Execution Console
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select pre-configured analytical queries with JOINs, GROUP BY, HAVING and Subqueries, or input custom SQL.
                </p>
              </div>

              {/* Preset selector */}
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-slate-600">Preset Query:</span>
                <select
                  value={selectedDemo}
                  onChange={(e) => handleSelectQuery(e.target.value)}
                  className="p-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  {DEMO_QUERIES.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* SQL Editor Area */}
            <div className="mt-4">
              <textarea
                rows={9}
                value={customSql}
                onChange={(e) => setCustomSql(e.target.value)}
                className="w-full font-mono text-xs p-3.5 bg-slate-900 text-emerald-400 rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Connected: MySQL 8.0 &bull; Database: <code className="font-bold text-slate-600">food_donation_db</code>
              </span>
              <button
                onClick={handleExecuteSql}
                disabled={queryExecuting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                <Play className={`w-3.5 h-3.5 fill-white ${queryExecuting ? "animate-pulse" : ""}`} />
                <span>{queryExecuting ? "Executing SQL..." : "Run Query"}</span>
              </button>
            </div>
          </div>

          {/* Results Display */}
          {queryResult && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              {queryResult.error ? (
                <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
                  <span>{queryResult.error}</span>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs text-slate-500">
                    <span className="font-bold text-slate-900 flex items-center">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mr-1.5" />
                      Query Executed Successfully
                    </span>
                    <div className="flex items-center space-x-3">
                      <span>Rows: <strong className="text-slate-800">{queryResult.rowsCount}</strong></span>
                      <span>&bull;</span>
                      <span>Execution Time: <strong className="text-emerald-700">{queryResult.durationMs} ms</strong></span>
                    </div>
                  </div>

                  {/* Tabular Output */}
                  {Array.isArray(queryResult.results) && queryResult.results.length > 0 ? (
                    <div className="mt-4 overflow-x-auto max-h-96">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider sticky top-0 border-b border-slate-200">
                          <tr>
                            {Object.keys(queryResult.results[0]).map((col) => (
                              <th key={col} className="p-2.5 font-bold whitespace-nowrap">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {queryResult.results.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/60">
                              {Object.keys(row).map((col) => (
                                <td key={col} className="p-2.5 text-slate-700 whitespace-nowrap">
                                  {row[col] !== null && row[col] !== undefined ? String(row[col]) : "NULL"}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-xs text-slate-400">
                      Query returned 0 rows or non-tabular result.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: DATABASE VIEWS */}
      {activeSection === "VIEWS" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center">
              <Eye className="w-4 h-4 mr-2 text-sky-600" />
              Verified MySQL Database Views
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              Virtual views pre-computed in MySQL providing optimized analytical encapsulation.
            </p>

            <div className="space-y-6">
              {/* View 1: v_pending_fulfillments */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50 p-3 border-b border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 font-mono">VIEW v_pending_fulfillments</span>
                  <span className="text-slate-500 text-[11px]">Unfulfilled requests with NGO & beneficiary metadata</span>
                </div>
                <div className="p-3 text-xs overflow-x-auto">
                  {analyticsData?.views?.pendingFulfillments?.length > 0 ? (
                    <pre className="font-mono text-[11px] text-slate-700 max-h-48 overflow-y-auto">
                      {JSON.stringify(analyticsData.views.pendingFulfillments, null, 2)}
                    </pre>
                  ) : (
                    <div className="text-slate-400">No pending fulfillments currently active.</div>
                  )}
                </div>
              </div>

              {/* View 2: v_donor_contribution_summary */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50 p-3 border-b border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 font-mono">VIEW v_donor_contribution_summary</span>
                  <span className="text-slate-500 text-[11px]">Cumulative donation statistics, active vs allocated batches</span>
                </div>
                <div className="p-3 text-xs overflow-x-auto">
                  {analyticsData?.views?.donorSummary?.length > 0 ? (
                    <pre className="font-mono text-[11px] text-slate-700 max-h-48 overflow-y-auto">
                      {JSON.stringify(analyticsData.views.donorSummary, null, 2)}
                    </pre>
                  ) : (
                    <div className="text-slate-400">No donor statistics found.</div>
                  )}
                </div>
              </div>

              {/* View 3: v_ngo_request_status */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50 p-3 border-b border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 font-mono">VIEW v_ngo_request_status</span>
                  <span className="text-slate-500 text-[11px]">NGO demand, satisfied percentage and satisfaction stats</span>
                </div>
                <div className="p-3 text-xs overflow-x-auto">
                  {analyticsData?.views?.ngoStatus?.length > 0 ? (
                    <pre className="font-mono text-[11px] text-slate-700 max-h-48 overflow-y-auto">
                      {JSON.stringify(analyticsData.views.ngoStatus, null, 2)}
                    </pre>
                  ) : (
                    <div className="text-slate-400">No NGO metrics found.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: PROCEDURES & TRIGGERS */}
      {activeSection === "PROCEDURES" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center">
                <Workflow className="w-4 h-4 mr-2 text-amber-600" />
                Stored Procedures, Functions & Triggers Specification
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Full implementation residing inside MySQL database `food_donation_db`.
              </p>
            </div>

            {/* Stored Procedure sp_allocate_food_stock */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono font-bold text-sm text-purple-900">
                  PROCEDURE sp_allocate_food_stock
                </span>
                <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-bold">
                  ACID TRANSACTION &bull; ROW LOCKING (FOR UPDATE)
                </span>
              </div>
              <p className="text-xs text-slate-600 mb-3">
                Performs an atomic allocation between a food request and food listing. Uses <code className="font-bold">FOR UPDATE</code> to lock the rows, verifies expiry date, ensures <code className="font-bold">available_quantity &gt;= requested_qty</code>, inserts into junction table <code className="font-bold">request_allocations</code>, deducts stock, updates statuses, automatically schedules volunteer pickup, and commits. Rolls back cleanly upon any violation.
              </p>
              <pre className="bg-slate-900 text-slate-200 p-3 rounded-lg text-[11px] font-mono overflow-x-auto">
{`-- Procedure Invocation Example
CALL sp_allocate_food_stock(p_request_id, p_listing_id, p_alloc_qty, p_admin_id, @alloc_id, @res_code, @res_msg);
SELECT @alloc_id, @res_code, @res_msg;`}
              </pre>
            </div>

            {/* Triggers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                <div className="font-mono font-bold text-xs text-emerald-900 mb-1">
                  TRIGGER trg_prevent_negative_inventory
                </div>
                <div className="text-[11px] text-slate-500 mb-2">BEFORE UPDATE ON food_listings</div>
                <p className="text-xs text-slate-600">
                  Blocks any update attempting to drive <code className="font-bold">available_quantity &lt; 0</code> with <code className="font-mono text-rose-700">SIGNAL SQLSTATE &apos;45000&apos;</code>.
                </p>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                <div className="font-mono font-bold text-xs text-amber-900 mb-1">
                  TRIGGER trg_prevent_expired_allocation
                </div>
                <div className="text-[11px] text-slate-500 mb-2">BEFORE INSERT ON request_allocations</div>
                <p className="text-xs text-slate-600">
                  Blocks creating an allocation if the food listing&apos;s expiry date is in the past, ensuring no expired food enters logistics.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: MONGODB AUDIT & AGGREGATIONS */}
      {activeSection === "MONGO_AUDIT" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center">
                  <BarChart3 className="w-4 h-4 mr-2 text-emerald-600" />
                  MongoDB Activity Logs & Aggregation Pipelines
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Polyglot persistence: MongoDB audit event streams processed via native aggregation pipelines ($group, $sort, $dateToString).
                </p>
              </div>
              <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 font-bold">
                Status: {analyticsData?.mongoAudit?.status || "Connecting..."}
              </span>
            </div>

            {/* Aggregation 1: Action Breakdown */}
            <div className="mt-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                Pipeline 1: Action Frequency Breakdown ($group by $action)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {analyticsData?.mongoAudit?.actionStats?.map((item: any) => (
                  <div key={item._id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <div className="font-semibold text-slate-800 truncate">{item._id}</div>
                    <div className="text-xl font-bold text-emerald-600 mt-1">{item.count} events</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Aggregation 2: Role Distribution */}
            <div className="mt-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                Pipeline 2: User Role Activity Distribution ($group by $role)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {analyticsData?.mongoAudit?.roleStats?.map((item: any) => (
                  <div key={item._id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <div className="font-semibold text-slate-800">{item._id}</div>
                    <div className="text-xl font-bold text-sky-600 mt-1">{item.count} actions</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Aggregation 3: Recent Raw Event Stream */}
            <div className="mt-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                Recent Audit Trail Documents (collection: audit_events)
              </h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Action</th>
                      <th className="p-2.5">User</th>
                      <th className="p-2.5">Role</th>
                      <th className="p-2.5">Entity</th>
                      <th className="p-2.5">Details</th>
                      <th className="p-2.5">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {analyticsData?.mongoAudit?.recentLogs?.map((log: any) => (
                      <tr key={log._id} className="hover:bg-slate-50/60">
                        <td className="p-2.5 font-bold text-slate-800">{log.action}</td>
                        <td className="p-2.5 text-slate-600">{log.userEmail || "System"}</td>
                        <td className="p-2.5 text-slate-600">{log.role || "N/A"}</td>
                        <td className="p-2.5 text-purple-700 font-semibold">{log.entityType || "SYSTEM"}</td>
                        <td className="p-2.5 text-[11px] text-slate-500 max-w-xs truncate">
                          {JSON.stringify(log.details || {})}
                        </td>
                        <td className="p-2.5 text-slate-400 text-[11px]">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
