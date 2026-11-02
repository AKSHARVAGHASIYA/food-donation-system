"use client";

import React, { useState, useEffect } from "react";
import {
  Truck,
  MapPin,
  Phone,
  CheckCircle2,
  AlertCircle,
  PackageCheck,
  Navigation,
} from "lucide-react";
import StatusBadge from "@/components/StatusBadge";

interface PickupItem {
  id: number;
  pickup_time_scheduled: string;
  actual_pickup_time?: string | null;
  pickup_status: string;
  quantity_collected?: number | null;
  donor_signature_name?: string | null;
  verification_otp?: string | null;
  notes?: string | null;
  listing: {
    title: string;
    food_category: string;
    unit: string;
    pickup_address: string;
    city: string;
    storage_requirement: string;
    donor: {
      organization_name?: string;
      user: { full_name: string; phone: string };
    };
  };
  allocation: {
    id: number;
    allocated_quantity: number;
    request: {
      delivery_address: string;
      city: string;
      ngo: { ngo_name: string; contact_person: string };
      beneficiaryGroup?: { group_name: string } | null;
    };
  };
  volunteer?: {
    id: number;
    vehicle_type: string;
    deliveries_completed: number;
    rating: number;
    user: { full_name: string; phone: string };
  } | null;
}

export default function VolunteerDashboardPage() {
  const [pickups, setPickups] = useState<PickupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ALL" | "SCHEDULED" | "DELIVERED">("ALL");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [otpInputs, setOtpInputs] = useState<Record<number, string>>({});
  const [signatureInputs, setSignatureInputs] = useState<Record<number, string>>({});
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchPickups = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/pickups");
      if (res.ok) {
        const data = await res.json();
        setPickups(data.pickups || []);
      }
    } catch (e) {
      console.error("Fetch pickups error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPickups();
  }, []);

  const handleUpdateStatus = async (
    pickupId: number,
    newStatus: string,
    requireOtp = false
  ) => {
    setActionMessage(null);
    setUpdatingId(pickupId);

    const otp = otpInputs[pickupId];
    const signature = signatureInputs[pickupId];

    if (requireOtp && !otp) {
      setActionMessage({ type: "error", text: "Please enter the verification OTP from the donor." });
      setUpdatingId(null);
      return;
    }

    try {
      const res = await fetch("/api/pickups", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickupId,
          newStatus,
          otp: otp || undefined,
          donorSignature: signature || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionMessage({ type: "error", text: data.error || "Failed to update pickup status" });
      } else {
        setActionMessage({
          type: "success",
          text: `Pickup #${pickupId} updated to ${newStatus.replace(/_/g, " ")}!`,
        });
        fetchPickups();
      }
    } catch {
      setActionMessage({ type: "error", text: "Server error occurred" });
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredPickups = pickups.filter((p) => {
    if (activeTab === "SCHEDULED") return p.pickup_status !== "DELIVERED_TO_HUB";
    if (activeTab === "DELIVERED") return p.pickup_status === "DELIVERED_TO_HUB";
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-amber-600 uppercase tracking-wider">
            <Truck className="w-4 h-4" />
            <span>Volunteer Logistics Pipeline</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
            Food Transport & Handover
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Transport surplus food batches from donor premises to NGO hubs with OTP verification and condition tracking.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`px-3 py-1.5 rounded-lg font-medium cursor-pointer transition-colors ${
              activeTab === "ALL" ? "bg-white text-slate-900 shadow-2xs font-semibold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Tasks ({pickups.length})
          </button>
          <button
            onClick={() => setActiveTab("SCHEDULED")}
            className={`px-3 py-1.5 rounded-lg font-medium cursor-pointer transition-colors ${
              activeTab === "SCHEDULED" ? "bg-white text-amber-800 shadow-2xs font-semibold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Active In-Transit
          </button>
          <button
            onClick={() => setActiveTab("DELIVERED")}
            className={`px-3 py-1.5 rounded-lg font-medium cursor-pointer transition-colors ${
              activeTab === "DELIVERED" ? "bg-white text-emerald-800 shadow-2xs font-semibold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Delivered
          </button>
        </div>
      </div>

      {actionMessage && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center space-x-2 ${
            actionMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          {actionMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading pickups...</div>
      ) : filteredPickups.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">No Pickups Found</h3>
          <p className="text-sm text-slate-500 mt-1">There are no tasks matching the selected filter.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredPickups.map((p) => {
            const isCompleted = p.pickup_status === "DELIVERED_TO_HUB";
            const isPickedUp = p.pickup_status === "PICKED_UP";
            const isEnRoute = p.pickup_status === "EN_ROUTE_TO_PICKUP";
            const isAssigned = p.pickup_status === "ASSIGNED" || p.pickup_status === "SCHEDULED";

            return (
              <div
                key={p.id}
                className={`bg-white rounded-2xl border p-6 shadow-xs transition-all ${
                  isCompleted ? "border-slate-200 opacity-90" : "border-amber-200 ring-1 ring-amber-100"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        PICKUP #{p.id}
                      </span>
                      <StatusBadge status={p.pickup_status} />
                      {p.verification_otp && (
                        <span className="text-[11px] font-mono font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                          Handover OTP: {p.verification_otp}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mt-1">
                      {p.listing.title}
                    </h3>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Batch Size: <strong className="text-slate-800">{p.allocation.allocated_quantity} {p.listing.unit}</strong> &bull; Category: {p.listing.food_category.replace(/_/g, " ")} &bull; Storage: {p.listing.storage_requirement.replace(/_/g, " ")}
                    </div>
                  </div>

                  {/* Volunteer assignment info */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">
                        {p.volunteer ? p.volunteer.user.full_name : "Unassigned Logistics Task"}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center space-x-2">
                        <span>Vehicle: {p.volunteer?.vehicle_type || "Any"}</span>
                        {p.volunteer && <span>&bull; Deliveries: {p.volunteer.deliveries_completed}</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Routing Addresses: Pickup -> Drop Point */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 text-xs">
                  <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                    <div className="font-bold text-emerald-800 flex items-center mb-1">
                      <MapPin className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                      Step 1: Collection Point (Donor)
                    </div>
                    <div className="font-semibold text-slate-800">
                      {p.listing.donor.organization_name || p.listing.donor.user.full_name}
                    </div>
                    <div className="text-slate-600 mt-0.5">{p.listing.pickup_address}, {p.listing.city}</div>
                    <div className="text-slate-500 mt-1 flex items-center">
                      <Phone className="w-3 h-3 mr-1 text-slate-400" />
                      Contact: {p.listing.donor.user.phone}
                    </div>
                  </div>

                  <div className="p-3 bg-sky-50/50 rounded-xl border border-sky-100">
                    <div className="font-bold text-sky-800 flex items-center mb-1">
                      <Navigation className="w-3.5 h-3.5 mr-1 text-sky-600" />
                      Step 2: Destination Hub (NGO Drop)
                    </div>
                    <div className="font-semibold text-slate-800">{p.allocation.request.ngo.ngo_name}</div>
                    <div className="text-slate-600 mt-0.5">
                      {p.allocation.request.delivery_address}, {p.allocation.request.city}
                    </div>
                    <div className="text-slate-500 mt-1">
                      Recipient Rep: {p.allocation.request.ngo.contact_person}
                    </div>
                  </div>
                </div>

                {/* Pipeline Progression Controls */}
                {!isCompleted && (
                  <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center space-x-2">
                      {isEnRoute && (
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            placeholder="Enter Donor OTP"
                            value={otpInputs[p.id] || ""}
                            onChange={(e) => setOtpInputs({ ...otpInputs, [p.id]: e.target.value })}
                            className="p-1.5 border border-slate-300 rounded text-xs font-mono w-32 focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                          <input
                            type="text"
                            placeholder="Donor Signature Name"
                            value={signatureInputs[p.id] || ""}
                            onChange={(e) => setSignatureInputs({ ...signatureInputs, [p.id]: e.target.value })}
                            className="p-1.5 border border-slate-300 rounded text-xs w-40 focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      {isAssigned && (
                        <button
                          onClick={() => handleUpdateStatus(p.id, "EN_ROUTE_TO_PICKUP")}
                          disabled={updatingId === p.id}
                          className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold flex items-center cursor-pointer transition-colors"
                        >
                          <Navigation className="w-3.5 h-3.5 mr-1.5" />
                          <span>Start Trip (En Route)</span>
                        </button>
                      )}

                      {isEnRoute && (
                        <button
                          onClick={() => handleUpdateStatus(p.id, "PICKED_UP", true)}
                          disabled={updatingId === p.id}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center cursor-pointer transition-colors"
                        >
                          <PackageCheck className="w-3.5 h-3.5 mr-1.5" />
                          <span>Verify OTP & Confirm Picked Up</span>
                        </button>
                      )}

                      {isPickedUp && (
                        <button
                          onClick={() => handleUpdateStatus(p.id, "DELIVERED_TO_HUB")}
                          disabled={updatingId === p.id}
                          className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-semibold flex items-center cursor-pointer transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                          <span>Confirm Handover at NGO Hub (Completed)</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
