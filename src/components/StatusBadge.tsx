import React from "react";

interface StatusBadgeProps {
  status: string;
  type?: "status" | "urgency" | "category" | "role";
}

export function StatusBadge({ status, type = "status" }: StatusBadgeProps) {
  let colorClasses = "bg-slate-100 text-slate-700 border-slate-200";

  const upper = (status || "").toUpperCase();

  if (type === "urgency") {
    switch (upper) {
      case "CRITICAL":
        colorClasses = "bg-rose-100 text-rose-800 border-rose-300 font-semibold animate-pulse";
        break;
      case "HIGH":
        colorClasses = "bg-amber-100 text-amber-800 border-amber-300 font-medium";
        break;
      case "MEDIUM":
        colorClasses = "bg-blue-100 text-blue-800 border-blue-300";
        break;
      case "LOW":
        colorClasses = "bg-emerald-100 text-emerald-800 border-emerald-300";
        break;
    }
  } else if (type === "role") {
    switch (upper) {
      case "ADMIN":
        colorClasses = "bg-purple-100 text-purple-800 border-purple-300";
        break;
      case "DONOR":
        colorClasses = "bg-emerald-100 text-emerald-800 border-emerald-300";
        break;
      case "NGO":
        colorClasses = "bg-sky-100 text-sky-800 border-sky-300";
        break;
      case "VOLUNTEER":
        colorClasses = "bg-amber-100 text-amber-800 border-amber-300";
        break;
    }
  } else {
    // Standard status
    switch (upper) {
      case "AVAILABLE":
      case "ACTIVE":
      case "VERIFIED":
      case "FULFILLED":
      case "DELIVERED":
      case "DELIVERED_TO_HUB":
      case "DISTRIBUTED":
        colorClasses = "bg-emerald-100 text-emerald-800 border-emerald-300";
        break;
      case "PARTIALLY_ALLOCATED":
      case "PARTIALLY_FULFILLED":
      case "ASSIGNED":
      case "EN_ROUTE_TO_PICKUP":
      case "IN_TRANSIT":
      case "RESERVED":
        colorClasses = "bg-amber-100 text-amber-800 border-amber-300";
        break;
      case "FULLY_ALLOCATED":
      case "DISPATCHED":
      case "PICKED_UP":
        colorClasses = "bg-blue-100 text-blue-800 border-blue-300";
        break;
      case "PENDING":
      case "SCHEDULED":
      case "PENDING_VERIFICATION":
        colorClasses = "bg-slate-100 text-slate-700 border-slate-300";
        break;
      case "EXPIRED":
      case "CANCELLED":
      case "FAILED":
      case "SUSPENDED":
      case "REJECTED":
        colorClasses = "bg-rose-100 text-rose-800 border-rose-300";
        break;
    }
  }

  // Format label nicely: replace underscores with spaces
  const label = upper.replace(/_/g, " ");

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClasses}`}
    >
      {label}
    </span>
  );
}

export default StatusBadge;
