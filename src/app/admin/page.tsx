"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Users,
  UtensilsCrossed,
  Building2,
  Layers,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Lock,
} from "lucide-react";
import StatusBadge from "@/components/StatusBadge";

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<"USERS" | "LISTINGS" | "REQUESTS" | "ALLOCATIONS">("USERS");
  const [listings, setListings] = useState<Record<string, any>[]>([]);
  const [requests, setRequests] = useState<Record<string, any>[]>([]);
  const [allocations, setAllocations] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);

  // Manual allocation form inside admin
  const [allocForm, setAllocForm] = useState({
    requestId: "",
    listingId: "",
    allocatedQuantity: "",
    useStoredProcedure: false,
  });
  const [allocResult, setAllocResult] = useState<{ success?: string; error?: string } | null>(null);
  const [allocating, setAllocating] = useState(false);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [listRes, reqRes, allocRes] = await Promise.all([
        fetch("/api/listings"),
        fetch("/api/requests"),
        fetch("/api/allocations"),
      ]);

      if (listRes.ok) {
        const d = await listRes.json();
        setListings(d.listings || []);
      }
      if (reqRes.ok) {
        const d = await reqRes.json();
        setRequests(d.requests || []);
      }
      if (allocRes.ok) {
        const d = await allocRes.json();
        setAllocations(d.allocations || []);
      }
    } catch (e) {
      console.error("Admin fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleManualAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setAllocResult(null);
    setAllocating(true);

    try {
      const res = await fetch("/api/allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(allocForm),
      });

      const data = await res.json();
      if (!res.ok) {
        setAllocResult({ error: data.error || "Allocation failed." });
      } else {
        setAllocResult({
          success: `${data.message} (${data.mechanism || "Transaction Completed"})`,
        });
        fetchAllData();
        setAllocForm({ requestId: "", listingId: "", allocatedQuantity: "", useStoredProcedure: false });
      }
    } catch {
      setAllocResult({ error: "Server connection failure." });
    } finally {
      setAllocating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-purple-600 uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4" />
            <span>Master System Administration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
            Governance & Entity Management
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Admin oversight across all 10 relational entities, transactional allocations, and database integrity.
          </p>
        </div>

        <button
          onClick={fetchAllData}
          className="inline-flex items-center px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Manual Transactional Allocation Console */}
      <div className="bg-gradient-to-r from-purple-50 via-slate-50 to-white rounded-2xl border border-purple-200 p-6 shadow-xs">
        <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-purple-700 mb-1">
          <Lock className="w-4 h-4" />
          <span>Transactional Stock Allocation Console</span>
        </div>
        <h2 className="text-base font-bold text-slate-900">
          Atomic Food Allocation & Over-Allocation Prevention
        </h2>
        <p className="text-xs text-slate-600 mt-0.5 max-w-2xl">
          Assigns food stock from a <code className="font-bold">FOOD_LISTING</code> to a <code className="font-bold">FOOD_REQUEST</code> via the <code className="font-bold">REQUEST_ALLOCATION</code> junction table. ACID transactions guarantee available stock never goes below zero and demand isn&apos;t exceeded.
        </p>

        {allocResult && (
          <div
            className={`mt-3 p-3 rounded-xl border text-xs flex items-center space-x-2 ${
              allocResult.success
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-rose-50 text-rose-800 border-rose-200"
            }`}
          >
            {allocResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{allocResult.success || allocResult.error}</span>
          </div>
        )}

        <form onSubmit={handleManualAllocation} className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Target Food Request *</label>
            <select
              required
              value={allocForm.requestId}
              onChange={(e) => setAllocForm({ ...allocForm, requestId: e.target.value })}
              className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white outline-none"
            >
              <option value="">-- Select Pending Request --</option>
              {requests
                .filter((r) => r.status !== "FULFILLED")
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    REQ #{r.id} - {r.requested_food_category} ({r.required_quantity - r.fulfilled_quantity} needed)
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Source Food Listing *</label>
            <select
              required
              value={allocForm.listingId}
              onChange={(e) => setAllocForm({ ...allocForm, listingId: e.target.value })}
              className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white outline-none"
            >
              <option value="">-- Select Available Listing --</option>
              {listings
                .filter((l) => Number(l.available_quantity) > 0)
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    LIST #{l.id} - {l.title} ({l.available_quantity} {l.unit} avail)
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Allocated Quantity *</label>
            <input
              type="number"
              step="0.01"
              min="1"
              required
              placeholder="e.g. 20"
              value={allocForm.allocatedQuantity}
              onChange={(e) => setAllocForm({ ...allocForm, allocatedQuantity: e.target.value })}
              className="w-full p-2 border border-slate-300 rounded-lg text-xs outline-none"
            />
          </div>

          <div className="flex flex-col justify-end">
            <div className="flex items-center space-x-1 mb-1.5 text-[11px] text-slate-600">
              <input
                type="checkbox"
                id="useSpCheckbox"
                checked={allocForm.useStoredProcedure}
                onChange={(e) => setAllocForm({ ...allocForm, useStoredProcedure: e.target.checked })}
                className="cursor-pointer"
              />
              <label htmlFor="useSpCheckbox" className="cursor-pointer">
                Use MySQL Stored Procedure
              </label>
            </div>
            <button
              type="submit"
              disabled={allocating}
              className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg text-xs shadow-xs cursor-pointer transition-colors disabled:opacity-50"
            >
              {allocating ? "Allocating..." : "Execute Allocation"}
            </button>
          </div>
        </form>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 text-xs">
        {[
          { key: "USERS", label: "User Governance", icon: Users },
          { key: "LISTINGS", label: "All Food Listings", count: listings.length, icon: UtensilsCrossed },
          { key: "REQUESTS", label: "All Food Requests", count: requests.length, icon: Building2 },
          { key: "ALLOCATIONS", label: "Junction Allocations", count: allocations.length, icon: Layers },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center space-x-1.5 py-2.5 px-4 font-semibold border-b-2 cursor-pointer transition-all ${
                isActive
                  ? "border-purple-600 text-purple-700 bg-purple-50/50 rounded-t-lg"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-bold">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content 1: ALLOCATIONS */}
      {activeTab === "ALLOCATIONS" && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800">
              REQUEST_ALLOCATION Junction Table Records ({allocations.length})
            </span>
            <span className="text-slate-500 text-[11px]">
              Decoupled M:N relation between FOOD_REQUEST and FOOD_LISTING
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Alloc ID</th>
                  <th className="p-3">Source Listing</th>
                  <th className="p-3">Destination Request</th>
                  <th className="p-3">Allocated Qty</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Pickup Task</th>
                  <th className="p-3">Allocated Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allocations.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-700">#{a.id}</td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-800">{a.listing.title}</div>
                      <div className="text-[11px] text-slate-500">Donor: {a.listing.donor.user.full_name}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-800">{a.request.ngo.ngo_name}</div>
                      <div className="text-[11px] text-slate-500">
                        Group: {a.request.beneficiaryGroup?.group_name || "General"}
                      </div>
                    </td>
                    <td className="p-3 font-bold text-emerald-700">
                      {a.allocated_quantity} {a.listing.unit}
                    </td>
                    <td className="p-3">
                      <StatusBadge status={a.allocation_status} />
                    </td>
                    <td className="p-3 text-[11px]">
                      {a.pickups && a.pickups[0] ? (
                        <span className="text-purple-700 font-medium">
                          Pickup #{a.pickups[0].id} &bull; {a.pickups[0].pickup_status}
                        </span>
                      ) : (
                        <span className="text-slate-400">None</span>
                      )}
                    </td>
                    <td className="p-3 text-slate-500 text-[11px]">
                      {new Date(a.allocated_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content 2: LISTINGS */}
      {activeTab === "LISTINGS" && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">ID</th>
                  <th className="p-3">Batch Title</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Initial Stock</th>
                  <th className="p-3">Available Stock</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">City</th>
                  <th className="p-3">Expiry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {listings.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/60">
                    <td className="p-3 font-mono font-bold text-slate-700">#{l.id}</td>
                    <td className="p-3 font-semibold text-slate-800">{l.title}</td>
                    <td className="p-3 text-slate-600">{l.food_category.replace(/_/g, " ")}</td>
                    <td className="p-3 font-medium text-slate-700">{l.quantity} {l.unit}</td>
                    <td className="p-3 font-bold text-emerald-700">{l.available_quantity} {l.unit}</td>
                    <td className="p-3"><StatusBadge status={l.status} /></td>
                    <td className="p-3 text-slate-500">{l.city}</td>
                    <td className="p-3 text-slate-500 text-[11px]">{new Date(l.expiry_date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content 3: REQUESTS */}
      {activeTab === "REQUESTS" && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">ID</th>
                  <th className="p-3">NGO Name</th>
                  <th className="p-3">Requested Food</th>
                  <th className="p-3">Required</th>
                  <th className="p-3">Fulfilled</th>
                  <th className="p-3">Urgency</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Needed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60">
                    <td className="p-3 font-mono font-bold text-slate-700">#{r.id}</td>
                    <td className="p-3 font-semibold text-slate-800">{r.ngo.ngo_name}</td>
                    <td className="p-3 text-slate-600">{r.requested_food_category.replace(/_/g, " ")}</td>
                    <td className="p-3 font-medium text-slate-700">{r.required_quantity} {r.unit}</td>
                    <td className="p-3 font-bold text-sky-700">{r.fulfilled_quantity} {r.unit}</td>
                    <td className="p-3"><StatusBadge status={r.urgency_level} type="urgency" /></td>
                    <td className="p-3"><StatusBadge status={r.status} /></td>
                    <td className="p-3 text-slate-500 text-[11px]">{new Date(r.needed_by).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content 4: USERS */}
      {activeTab === "USERS" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-purple-700 mb-2">
            Role-Based Access Governance
          </div>
          <p className="text-xs text-slate-500 mb-4">
            User credentials securely hashed via bcrypt. All 4 roles with corresponding profile extension entities.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
              <div className="font-bold text-purple-900 text-sm">System Admin</div>
              <div className="text-slate-600 mt-1">Dr. Arvind Mehta</div>
              <div className="text-[11px] text-slate-500">admin@foodbridge.org</div>
              <div className="mt-2"><StatusBadge status="ADMIN" type="role" /></div>
            </div>

            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <div className="font-bold text-emerald-900 text-sm">Grand Kitchen (Donor)</div>
              <div className="text-slate-600 mt-1">Chef Rajesh Kapoor</div>
              <div className="text-[11px] text-slate-500">grandkitchen@gmail.com</div>
              <div className="mt-2"><StatusBadge status="DONOR" type="role" /></div>
            </div>

            <div className="p-4 bg-sky-50 rounded-xl border border-sky-200">
              <div className="font-bold text-sky-900 text-sm">Hope For All (NGO)</div>
              <div className="text-slate-600 mt-1">Sister Mary Fernandez</div>
              <div className="text-[11px] text-slate-500">hopefoundation@gmail.com</div>
              <div className="mt-2"><StatusBadge status="NGO" type="role" /></div>
            </div>

            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
              <div className="font-bold text-amber-900 text-sm">Volunteer Logistics</div>
              <div className="text-slate-600 mt-1">Rahul Sharma (Bike)</div>
              <div className="text-[11px] text-slate-500">rahul.volunteer@gmail.com</div>
              <div className="mt-2"><StatusBadge status="VOLUNTEER" type="role" /></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
