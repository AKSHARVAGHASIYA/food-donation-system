"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { HeartHandshake, LogIn, KeyRound, Mail, AlertCircle, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const demoAccounts = [
    { role: "ADMIN", email: "admin@foodbridge.org", pass: "Admin@123", label: "Admin Coordinator" },
    { role: "DONOR", email: "grandkitchen@gmail.com", pass: "Donor@123", label: "Grand Kitchen Banquet" },
    { role: "DONOR", email: "freshmart@gmail.com", pass: "Donor@123", label: "FreshMart Hypermarket" },
    { role: "NGO", email: "hopefoundation@gmail.com", pass: "Ngo@123", label: "Hope For All Foundation" },
    { role: "NGO", email: "annaseva@gmail.com", pass: "Ngo@123", label: "Anna Seva Trust" },
    { role: "VOLUNTEER", email: "rahul.volunteer@gmail.com", pass: "Volunteer@123", label: "Rahul Sharma (Bike)" },
  ];

  const handleQuickFill = (accEmail: string, accPass: string) => {
    setEmail(accEmail);
    setPassword(accPass);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }

      // Redirect based on role
      const role = data.user.role;
      if (role === "DONOR") router.push("/donor");
      else if (role === "NGO") router.push("/ngo");
      else if (role === "VOLUNTEER") router.push("/volunteer");
      else router.push("/admin");

      router.refresh();
    } catch {
      setError("Network or server error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white mx-auto shadow-md shadow-emerald-200">
          <HeartHandshake className="w-7 h-7" />
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900">
          Sign In to FoodBridge
        </h2>
        <p className="mt-1 text-center text-sm text-slate-500">
          Role-Based Access for Donors, NGOs, Volunteers & Admins
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-slate-200 sm:rounded-2xl sm:px-10">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start space-x-2 text-rose-700 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative rounded-lg shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="e.g. admin@foodbridge.org"
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Password
              </label>
              <div className="relative rounded-lg shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <LogIn className="w-4 h-4 mr-2" />
              {loading ? "Authenticating..." : "Sign In"}
            </button>
          </form>

          {/* Quick-fill Demo Accounts */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Quick-Fill Demo Accounts:</span>
              <span className="text-[10px] text-emerald-600 font-bold">1-Click Auto-Fill</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleQuickFill(acc.email, acc.pass)}
                  className="p-2 text-left rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all text-xs cursor-pointer group"
                >
                  <div className="font-semibold text-slate-800 group-hover:text-emerald-700 flex items-center justify-between">
                    <span>{acc.role}</span>
                    <CheckCircle2 className="w-3 h-3 text-slate-300 group-hover:text-emerald-500" />
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">{acc.label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
