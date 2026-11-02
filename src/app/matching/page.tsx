"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Zap,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Lock,
  RefreshCw,
} from "lucide-react";
import StatusBadge from "@/components/StatusBadge";

interface Candidate {
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
}

interface MatchItem {
  requestId: number;
  requestTitle: string;
  ngoName: string;
  requestedCategory: string;
  neededQuantity: number;
  unit: string;
  urgency: string;
  city: string;
  beneficiaryTarget?: string;
  candidates: Candidate[];
}

export default function SmartMatchingPage() {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [allocatingListingId, setAllocatingListingId] = useState<number | null>(null);
  const [useStoredProc, setUseStoredProc] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/matching");
      if (res.ok) {
        const data = await res.json();
        setMatches(data.matches || []);
      }
    } catch (e) {
      console.error("Match engine error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  const handleExecuteAllocation = async (
    requestId: number,
    listingId: number,
    qty: number
  ) => {
    setNotification(null);
    setAllocatingListingId(listingId);

    try {
      const res = await fetch("/api/allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          listingId,
          allocatedQuantity: qty,
          useStoredProcedure: useStoredProc,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setNotification({
          type: "error",
          text: `Transaction Rolled Back: ${data.error || "Allocation failed"}`,
        });
      } else {
        setNotification({
          type: "success",
          text: `Success: ${data.message} (${data.mechanism})`,
        });
        fetchMatches();
      }
    } catch {
      setNotification({ type: "error", text: "Network or transaction communication failure." });
    } finally {
      setAllocatingListingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-600 uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Smart Compatibility Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
            Food Matching & Allocation
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Automated multi-factor compatibility evaluation: category equivalence, shelf life, local proximity, and demand urgency.
          </p>
        </div>

        {/* Mechanism Toggle: Prisma Transaction vs MySQL Stored Procedure */}
        <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3 text-xs">
          <div className="font-semibold text-slate-700 flex items-center">
            <Lock className="w-3.5 h-3.5 mr-1 text-purple-600" />
            <span>Backend Engine:</span>
          </div>
          <label className="flex items-center space-x-1.5 cursor-pointer">
            <input
              type="radio"
              name="engine"
              checked={!useStoredProc}
              onChange={() => setUseStoredProc(false)}
              className="text-emerald-600"
            />
            <span className={!useStoredProc ? "font-bold text-emerald-700" : "text-slate-500"}>
              Prisma ACID Transaction
            </span>
          </label>
          <label className="flex items-center space-x-1.5 cursor-pointer">
            <input
              type="radio"
              name="engine"
              checked={useStoredProc}
              onChange={() => setUseStoredProc(true)}
              className="text-purple-600"
            />
            <span className={useStoredProc ? "font-bold text-purple-700" : "text-slate-500"}>
              MySQL Stored Procedure (sp_allocate_food_stock)
            </span>
          </label>
        </div>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center space-x-2 ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          )}
          <span className="font-medium">{notification.text}</span>
        </div>
      )}

      {loading ? (
        <div className="p-16 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-emerald-600" />
          <span>Computing compatibility matches across relational inventory...</span>
        </div>
      ) : matches.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">All Demands Fully Satisfied!</h3>
          <p className="text-sm text-slate-500 mt-1">
            There are no pending unfulfilled requests in the system.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {matches.map((item) => (
            <div
              key={item.requestId}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs"
            >
              {/* Request Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      REQ #{item.requestId}
                    </span>
                    <StatusBadge status={item.urgency} type="urgency" />
                    <span className="text-xs font-semibold text-slate-700">
                      Category: {item.requestedCategory.replace(/_/g, " ")}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">
                    {item.ngoName}
                  </h3>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center space-x-3">
                    <span>Target: {item.beneficiaryTarget || "Shelter Community"}</span>
                    <span>&bull;</span>
                    <span className="flex items-center">
                      <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      {item.city}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                    Required Quantity
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900">
                    {item.neededQuantity} <span className="text-sm font-normal text-slate-500">{item.unit}</span>
                  </div>
                </div>
              </div>

              {/* Compatible Candidates */}
              <div className="mt-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center justify-between">
                  <span>Candidate Donor Listings ({item.candidates.length} Matches Found)</span>
                  <span className="text-[11px] text-emerald-700 font-medium">Sorted by match score & expiry priority</span>
                </div>

                {item.candidates.length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400">
                    No active donor listing currently matches category {item.requestedCategory.replace(/_/g, " ")}.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {item.candidates.map((cand) => (
                      <div
                        key={cand.listingId}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-emerald-300 hover:shadow-xs transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                                LIST #{cand.listingId}
                              </span>
                              <div className="font-bold text-slate-900 text-sm mt-1">
                                {cand.listingTitle}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                Donor: {cand.donorOrg || cand.donorName} &bull; {cand.city}
                              </div>
                            </div>

                            {/* Score badge */}
                            <div className="text-right flex-shrink-0">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <Zap className="w-3 h-3 mr-0.5 text-emerald-600" />
                                {cand.score}% Match
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 border-t border-slate-200/60 pt-2">
                            <div>
                              <span className="text-slate-400 block text-[10px] uppercase">Available Stock</span>
                              <span className="font-bold text-slate-800">
                                {cand.availableQuantity} {cand.unit}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px] uppercase">Expiry Lifespan</span>
                              <span
                                className={`font-semibold ${
                                  cand.hoursUntilExpiry <= 24 ? "text-rose-600 font-bold" : "text-slate-800"
                                }`}
                              >
                                {cand.hoursUntilExpiry} hours left
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 1-Click Allocation Action */}
                        <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                          <span className="text-xs text-slate-600">
                            Allocate Batch: <strong className="text-emerald-700">{cand.matchQuantity} {cand.unit}</strong>
                          </span>

                          <button
                            onClick={() =>
                              handleExecuteAllocation(
                                item.requestId,
                                cand.listingId,
                                cand.matchQuantity
                              )
                            }
                            disabled={allocatingListingId === cand.listingId}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-2xs flex items-center cursor-pointer transition-colors disabled:opacity-50"
                          >
                            <span>
                              {allocatingListingId === cand.listingId
                                ? "Allocating..."
                                : "1-Click Allocate"}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 ml-1" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
