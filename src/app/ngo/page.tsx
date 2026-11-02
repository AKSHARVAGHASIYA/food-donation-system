"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  PlusCircle,
  Users,
  MapPin,
  Clock,
  Heart,
  FileCheck2,
} from "lucide-react";
import StatusBadge from "@/components/StatusBadge";

interface BeneficiaryGroup {
  id: number;
  group_name: string;
  location: string;
  target_headcount: number;
  vulnerability_type: string;
}

interface FoodRequestItem {
  id: number;
  requested_food_category: string;
  required_quantity: string | number;
  fulfilled_quantity: string | number;
  unit: string;
  urgency_level: string;
  status: string;
  needed_by: string;
  delivery_address: string;
  city: string;
  notes?: string | null;
  beneficiaryGroup?: BeneficiaryGroup | null;
  ngo: {
    ngo_name: string;
    contact_person: string;
  };
  allocations?: Array<{
    id: number;
    allocated_quantity: string | number;
    allocation_status: string;
    listing: {
      id: number;
      title: string;
      food_category: string;
    };
  }>;
}

export default function NgoDashboardPage() {
  const [requests, setRequests] = useState<FoodRequestItem[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showDistModal, setShowDistModal] = useState(false);
  const [selectedAllocationId, setSelectedAllocationId] = useState<number | null>(null);

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // New Request Form
  const [reqForm, setReqForm] = useState({
    requested_food_category: "COOKED_MEALS",
    required_quantity: "",
    unit: "MEALS",
    urgency_level: "HIGH",
    needed_by: "",
    delivery_address: "Hope For All Community Kitchen, Dharavi Transit Camp",
    city: "Mumbai",
    beneficiary_group_id: "",
    notes: "",
  });

  // New Beneficiary Group Form
  const [groupForm, setGroupForm] = useState({
    group_name: "",
    location: "Dharavi, Mumbai",
    target_headcount: "",
    vulnerability_type: "LOW_INCOME_COMMUNITY",
    contact_representative: "",
    notes: "",
  });

  // Distribution Form
  const [distForm, setDistForm] = useState({
    distributed_quantity: "",
    beneficiaries_served_count: "",
    received_by_person: "",
    feedback_notes: "",
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [reqRes, bgRes] = await Promise.all([
        fetch("/api/requests"),
        fetch("/api/beneficiaries"),
      ]);

      if (reqRes.ok) {
        const d = await reqRes.json();
        setRequests(d.requests || []);
      }
      if (bgRes.ok) {
        const bg = await bgRes.json();
        setBeneficiaries(bg.groups || []);
      }
    } catch (e) {
      console.error("Fetch NGO data error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reqForm),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to submit request");
        setSubmitting(false);
        return;
      }

      setFormSuccess("Food request submitted successfully!");
      fetchData();
      setTimeout(() => {
        setShowRequestModal(false);
        setFormSuccess(null);
      }, 1200);
    } catch {
      setFormError("Server connection error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/beneficiaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(groupForm),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to register group");
        setSubmitting(false);
        return;
      }

      setFormSuccess("Beneficiary community group registered!");
      fetchData();
      setTimeout(() => {
        setShowGroupModal(false);
        setFormSuccess(null);
      }, 1200);
    } catch {
      setFormError("Server connection error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogDistribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAllocationId) return;
    setFormError(null);
    setFormSuccess(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/distributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allocation_id: selectedAllocationId,
          ...distForm,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to log distribution");
        setSubmitting(false);
        return;
      }

      setFormSuccess("Distribution recorded successfully!");
      fetchData();
      setTimeout(() => {
        setShowDistModal(false);
        setFormSuccess(null);
      }, 1200);
    } catch {
      setFormError("Server error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-sky-600 uppercase tracking-wider">
            <Building2 className="w-4 h-4" />
            <span>NGO Demand & Distribution Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
            Food Requests & Fulfillment
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Submit nutritional requirements for beneficiary communities, monitor batch allocations, and record distribution.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setShowGroupModal(true);
              setFormError(null);
            }}
            className="inline-flex items-center justify-center px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
          >
            <Users className="w-4 h-4 mr-1.5 text-slate-600" />
            <span>+ Beneficiary Group</span>
          </button>

          <button
            onClick={() => {
              setShowRequestModal(true);
              setFormError(null);
            }}
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-semibold shadow-sm hover:bg-sky-700 transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            <span>Submit Food Request</span>
          </button>
        </div>
      </div>

      {/* Beneficiary Groups Summary Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-800 flex items-center">
            <Users className="w-4 h-4 mr-2 text-sky-600" />
            Target Beneficiary Communities ({beneficiaries.length})
          </h2>
          <span className="text-xs text-slate-500">Tracked under Entity BENEFICIARY_GROUP</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {beneficiaries.map((bg) => (
            <div key={bg.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div className="font-bold text-slate-900">{bg.group_name}</div>
              <div className="text-slate-500 mt-0.5">{bg.location}</div>
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="text-sky-700 font-semibold">{bg.target_headcount} People Headcount</span>
                <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600">
                  {bg.vulnerability_type.replace(/_/g, " ")}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Requests List */}
      <div>
        <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center">
          <span>Active Food Requests</span>
          <span className="ml-2 text-xs font-semibold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
            {requests.length}
          </span>
        </h2>

        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading requests...</div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">No Food Requests Submitted</h3>
            <p className="text-sm text-slate-500 mt-1">Submit your first food request to start receiving stock allocations.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => {
              const reqQty = Number(req.required_quantity);
              const fulQty = Number(req.fulfilled_quantity);
              const percent = reqQty > 0 ? Math.min(100, Math.round((fulQty / reqQty) * 100)) : 0;
              const remaining = reqQty - fulQty;

              return (
                <div
                  key={req.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          REQ #{req.id}
                        </span>
                        <StatusBadge status={req.urgency_level} type="urgency" />
                        <StatusBadge status={req.status} />
                      </div>
                      <h3 className="text-base font-bold text-slate-900">
                        {req.requested_food_category.replace(/_/g, " ")} &bull; {req.ngo.ngo_name}
                      </h3>
                      <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1 pt-1">
                        <span className="flex items-center">
                          <Users className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          Target: {req.beneficiaryGroup?.group_name || "General Shelter"}
                        </span>
                        <span className="flex items-center">
                          <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          Needed by: {new Date(req.needed_by).toLocaleDateString()}
                        </span>
                        <span className="flex items-center">
                          <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          {req.city}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar & Fulfillment Status */}
                    <div className="md:w-72 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-700">Fulfillment Progress</span>
                        <span className="font-bold text-sky-700">{percent}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full ${
                            percent === 100 ? "bg-emerald-500" : percent > 0 ? "bg-sky-500" : "bg-slate-300"
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="mt-1.5 flex justify-between text-[11px] text-slate-500">
                        <span>Fulfilled: <strong>{fulQty}</strong> {req.unit}</span>
                        <span>Remaining: <strong>{remaining > 0 ? remaining : 0}</strong> {req.unit}</span>
                      </div>
                    </div>
                  </div>

                  {/* Junction Table Allocations details */}
                  {req.allocations && req.allocations.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center">
                        <FileCheck2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                        <span>Fulfilling Stock Batches (Via REQUEST_ALLOCATION Junction):</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {req.allocations.map((alloc) => (
                          <div
                            key={alloc.id}
                            className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="font-semibold text-slate-800">
                                {alloc.listing.title}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                Allocated: <strong>{alloc.allocated_quantity}</strong> {req.unit} &bull; Status: {alloc.allocation_status}
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setSelectedAllocationId(alloc.id);
                                setShowDistModal(true);
                                setDistForm({
                                  distributed_quantity: String(alloc.allocated_quantity),
                                  beneficiaries_served_count: "80",
                                  received_by_person: req.ngo.contact_person,
                                  feedback_notes: "Distributed to children and families in good condition.",
                                });
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold transition-colors cursor-pointer"
                            >
                              Log Distribution
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal 1: Submit Food Request */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 relative my-8 text-xs">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center">
                <PlusCircle className="w-5 h-5 text-sky-600 mr-2" />
                Submit Food Request
              </h2>
              <button onClick={() => setShowRequestModal(false)} className="text-slate-400 text-xl cursor-pointer">
                &times;
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 bg-rose-50 text-rose-700 rounded-lg border border-rose-200">
                {formError}
              </div>
            )}
            {formSuccess && (
              <div className="mt-3 p-3 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">
                {formSuccess}
              </div>
            )}

            <form onSubmit={handleCreateRequest} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Requested Food Category *
                  </label>
                  <select
                    value={reqForm.requested_food_category}
                    onChange={(e) => setReqForm({ ...reqForm, requested_food_category: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white outline-none"
                  >
                    <option value="COOKED_MEALS">Cooked Meals</option>
                    <option value="RAW_INGREDIENTS">Raw Ingredients</option>
                    <option value="PACKAGED_FOOD">Packaged Food</option>
                    <option value="BAKERY">Bakery</option>
                    <option value="PRODUCE_FRUITS_VEG">Produce & Fruits</option>
                    <option value="DAIRY">Dairy</option>
                    <option value="BEVERAGES">Beverages</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Urgency Priority *
                  </label>
                  <select
                    value={reqForm.urgency_level}
                    onChange={(e) => setReqForm({ ...reqForm, urgency_level: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white outline-none"
                  >
                    <option value="CRITICAL">Critical (Immediate Emergency)</option>
                    <option value="HIGH">High (Within 24 Hours)</option>
                    <option value="MEDIUM">Medium (2-3 Days)</option>
                    <option value="LOW">Low (Weekly Ration)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Required Quantity * (&gt; 0)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="e.g. 50"
                    value={reqForm.required_quantity}
                    onChange={(e) => setReqForm({ ...reqForm, required_quantity: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Measurement Unit
                  </label>
                  <select
                    value={reqForm.unit}
                    onChange={(e) => setReqForm({ ...reqForm, unit: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white outline-none"
                  >
                    <option value="MEALS">Meals</option>
                    <option value="KG">Kilograms (kg)</option>
                    <option value="PACKETS">Packets</option>
                    <option value="LITERS">Liters</option>
                    <option value="BOXES">Boxes</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Target Beneficiary Group
                </label>
                <select
                  value={reqForm.beneficiary_group_id}
                  onChange={(e) => setReqForm({ ...reqForm, beneficiary_group_id: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white outline-none"
                >
                  <option value="">-- General NGO Distribution --</option>
                  {beneficiaries.map((bg) => (
                    <option key={bg.id} value={bg.id}>
                      {bg.group_name} ({bg.target_headcount} headcount)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Needed By Deadline *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={reqForm.needed_by}
                    onChange={(e) => setReqForm({ ...reqForm, needed_by: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={reqForm.city}
                    onChange={(e) => setReqForm({ ...reqForm, city: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Delivery Address / Drop Point *
                </label>
                <input
                  type="text"
                  required
                  value={reqForm.delivery_address}
                  onChange={(e) => setReqForm({ ...reqForm, delivery_address: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 cursor-pointer font-semibold"
                >
                  {submitting ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Register Beneficiary Group */}
      {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 text-xs">
            <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center">
              <Users className="w-5 h-5 text-sky-600 mr-2" />
              Register Beneficiary Group
            </h2>

            {formError && <div className="mb-3 p-2 bg-rose-50 text-rose-700 rounded border border-rose-200">{formError}</div>}
            {formSuccess && <div className="mb-3 p-2 bg-emerald-50 text-emerald-700 rounded border border-emerald-200">{formSuccess}</div>}

            <form onSubmit={handleCreateGroup} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Community / Shelter Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shanti Old Age Home"
                  value={groupForm.group_name}
                  onChange={(e) => setGroupForm({ ...groupForm, group_name: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Headcount *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 75"
                    value={groupForm.target_headcount}
                    onChange={(e) => setGroupForm({ ...groupForm, target_headcount: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Vulnerability Type</label>
                  <select
                    value={groupForm.vulnerability_type}
                    onChange={(e) => setGroupForm({ ...groupForm, vulnerability_type: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white outline-none"
                  >
                    <option value="CHILDREN_ORPHANAGE">Children Orphanage</option>
                    <option value="HOMELESS_SHELTER">Homeless Shelter</option>
                    <option value="ELDERLY_CARE">Elderly Care</option>
                    <option value="DISASTER_RELIEF">Disaster Relief</option>
                    <option value="LOW_INCOME_COMMUNITY">Low Income Slum</option>
                    <option value="MIGRANT_WORKERS">Migrant Workers</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Location / Cluster Address *</label>
                <input
                  type="text"
                  required
                  value={groupForm.location}
                  onChange={(e) => setGroupForm({ ...groupForm, location: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contact Representative</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. K. R. Nambiar"
                  value={groupForm.contact_representative}
                  onChange={(e) => setGroupForm({ ...groupForm, contact_representative: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowGroupModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3 py-1.5 bg-sky-600 text-white rounded hover:bg-sky-700 cursor-pointer font-semibold"
                >
                  {submitting ? "Saving..." : "Save Group"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Log Distribution */}
      {showDistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 text-xs">
            <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center">
              <Heart className="w-5 h-5 text-emerald-600 mr-2" />
              Log Distribution to Community
            </h2>

            {formError && <div className="mb-3 p-2 bg-rose-50 text-rose-700 rounded border border-rose-200">{formError}</div>}
            {formSuccess && <div className="mb-3 p-2 bg-emerald-50 text-emerald-700 rounded border border-emerald-200">{formSuccess}</div>}

            <form onSubmit={handleLogDistribution} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quantity Distributed *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={distForm.distributed_quantity}
                    onChange={(e) => setDistForm({ ...distForm, distributed_quantity: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">People Served Headcount *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 140"
                    value={distForm.beneficiaries_served_count}
                    onChange={(e) => setDistForm({ ...distForm, beneficiaries_served_count: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Received By Representative *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sister Mary Fernandez"
                  value={distForm.received_by_person}
                  onChange={(e) => setDistForm({ ...distForm, received_by_person: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Feedback Notes</label>
                <textarea
                  rows={2}
                  value={distForm.feedback_notes}
                  onChange={(e) => setDistForm({ ...distForm, feedback_notes: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowDistModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 cursor-pointer font-semibold"
                >
                  {submitting ? "Logging..." : "Confirm Distribution"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
