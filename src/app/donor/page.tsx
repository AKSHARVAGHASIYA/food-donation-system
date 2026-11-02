"use client";

import React, { useState, useEffect } from "react";
import {
  UtensilsCrossed,
  PlusCircle,
  Search,
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle2,
  Package,
} from "lucide-react";
import StatusBadge from "@/components/StatusBadge";

interface Listing {
  id: number;
  title: string;
  food_category: string;
  quantity: string | number;
  available_quantity: string | number;
  unit: string;
  expiry_date: string;
  dietary_type: string;
  storage_requirement: string;
  status: string;
  pickup_address: string;
  city: string;
  special_notes?: string | null;
  donor?: {
    organization_name?: string;
    user: { full_name: string; phone: string };
  };
}

export default function DonorDashboardPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    title: "",
    food_category: "COOKED_MEALS",
    quantity: "",
    unit: "MEALS",
    expiry_date: "",
    dietary_type: "VEGETARIAN",
    storage_requirement: "ROOM_TEMPERATURE",
    pickup_address: "Loading Bay 2, Behind Grand Kitchen, Bandra West",
    city: "Mumbai",
    special_notes: "",
  });

  const fetchListings = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory) params.set("category", selectedCategory);
      if (selectedStatus) params.set("status", selectedStatus);

      const res = await fetch(`/api/listings?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setListings(data.listings || []);
      }
    } catch (e) {
      console.error("Fetch listings error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [selectedCategory, selectedStatus]);

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || "Failed to create food listing");
        setSubmitting(false);
        return;
      }

      setFormSuccess("Food listing created successfully!");
      setFormData({
        title: "",
        food_category: "COOKED_MEALS",
        quantity: "",
        unit: "MEALS",
        expiry_date: "",
        dietary_type: "VEGETARIAN",
        storage_requirement: "ROOM_TEMPERATURE",
        pickup_address: "Loading Bay 2, Behind Grand Kitchen, Bandra West",
        city: "Mumbai",
        special_notes: "",
      });

      fetchListings();
      setTimeout(() => {
        setShowModal(false);
        setFormSuccess(null);
      }, 1200);
    } catch {
      setFormError("Server communication error");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredListings = listings.filter((l) =>
    l.title.toLowerCase().includes(search.toLowerCase()) ||
    l.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-600 uppercase tracking-wider">
            <UtensilsCrossed className="w-4 h-4" />
            <span>Donor Inventory Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
            Food Listings Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Post surplus edible food, define safe storage parameters, and oversee allocation status.
          </p>
        </div>

        <button
          onClick={() => {
            setShowModal(true);
            setFormError(null);
          }}
          className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold shadow-sm hover:bg-emerald-700 transition-colors cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 mr-2" />
          <span>Post New Food Listing</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search listings by title or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs sm:text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Categories</option>
            <option value="COOKED_MEALS">Cooked Meals</option>
            <option value="RAW_INGREDIENTS">Raw Ingredients</option>
            <option value="PACKAGED_FOOD">Packaged Food</option>
            <option value="BAKERY">Bakery</option>
            <option value="PRODUCE_FRUITS_VEG">Produce & Fruits</option>
            <option value="DAIRY">Dairy</option>
            <option value="BEVERAGES">Beverages</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs sm:text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="PARTIALLY_ALLOCATED">Partially Allocated</option>
            <option value="FULLY_ALLOCATED">Fully Allocated</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>
      </div>

      {/* Listings Table / Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading donor inventory...</div>
      ) : filteredListings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">No Food Listings Found</h3>
          <p className="text-sm text-slate-500 mt-1">
            No donations match the current filter criteria. Post a new listing to get started!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredListings.map((item) => {
            const avail = Number(item.available_quantity);
            const total = Number(item.quantity);
            const percent = total > 0 ? Math.round((avail / total) * 100) : 0;
            const hoursLeft = Math.round(
              (new Date(item.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60)
            );

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      #{item.id} &bull; {item.food_category.replace(/_/g, " ")}
                    </span>
                    <StatusBadge status={item.status} />
                  </div>

                  <h3 className="font-bold text-slate-900 mt-2 line-clamp-2 text-base">
                    {item.title}
                  </h3>

                  {/* Stock meter */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-slate-600 mb-1">
                      <span className="font-semibold">Stock Remaining:</span>
                      <span>
                        <strong className="text-emerald-700">{avail}</strong> / {total} {item.unit}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${
                          percent > 50
                            ? "bg-emerald-500"
                            : percent > 15
                            ? "bg-amber-500"
                            : "bg-rose-500"
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  {/* Meta Details */}
                  <div className="mt-4 space-y-1.5 text-xs text-slate-500 border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center text-slate-600">
                        <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                        Expires in:
                      </span>
                      <span
                        className={`font-semibold ${
                          hoursLeft <= 24 ? "text-rose-600 font-bold" : "text-slate-700"
                        }`}
                      >
                        {hoursLeft > 0 ? `${hoursLeft} hours` : "Expired"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Storage / Dietary:</span>
                      <span className="text-slate-700 font-medium">
                        {item.storage_requirement.replace(/_/g, " ")} &bull; {item.dietary_type}
                      </span>
                    </div>

                    <div className="flex items-start justify-between pt-1">
                      <span className="flex items-center text-slate-600">
                        <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400 flex-shrink-0" />
                        City:
                      </span>
                      <span className="text-slate-700 truncate max-w-[180px] text-right">
                        {item.city}
                      </span>
                    </div>

                    {item.special_notes && (
                      <div className="mt-2 p-2 bg-slate-50 rounded-lg text-[11px] text-slate-600 italic">
                        &quot;{item.special_notes}&quot;
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Donor: {item.donor?.organization_name || item.donor?.user.full_name || "Self"}</span>
                  <span className="text-emerald-600 font-medium">{percent}% unallocated</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create Food Listing */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 relative my-8">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center">
                <PlusCircle className="w-5 h-5 text-emerald-600 mr-2" />
                Post New Food Listing
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer text-xl leading-none"
              >
                &times;
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateListing} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Food Batch Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 50 Packaged Meals (Veg Pulao + Raita)"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Food Category *
                  </label>
                  <select
                    value={formData.food_category}
                    onChange={(e) => setFormData({ ...formData, food_category: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
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
                    Dietary Classification
                  </label>
                  <select
                    value={formData.dietary_type}
                    onChange={(e) => setFormData({ ...formData, dietary_type: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                  >
                    <option value="VEGETARIAN">Vegetarian</option>
                    <option value="NON_VEGETARIAN">Non-Vegetarian</option>
                    <option value="VEGAN">Vegan</option>
                    <option value="CONTAINS_EGG">Contains Egg</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Quantity * (Positive number)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    required
                    placeholder="e.g. 50"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Measurement Unit
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                  >
                    <option value="MEALS">Meals</option>
                    <option value="KG">Kilograms (kg)</option>
                    <option value="PACKETS">Packets</option>
                    <option value="LITERS">Liters</option>
                    <option value="BOXES">Boxes</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Expiry Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Storage Requirement
                  </label>
                  <select
                    value={formData.storage_requirement}
                    onChange={(e) => setFormData({ ...formData, storage_requirement: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                  >
                    <option value="ROOM_TEMPERATURE">Room Temperature</option>
                    <option value="REFRIGERATED">Refrigerated</option>
                    <option value="FROZEN">Frozen</option>
                    <option value="HEATED">Heated / Thermal</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Pickup Address / Loading Bay *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.pickup_address}
                    onChange={(e) => setFormData({ ...formData, pickup_address: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Special Notes / Handling Instructions
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Prepared under strict hygiene; insulated boxes available."
                  value={formData.special_notes}
                  onChange={(e) => setFormData({ ...formData, special_notes: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Publishing Listing..." : "Publish Food Listing"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
