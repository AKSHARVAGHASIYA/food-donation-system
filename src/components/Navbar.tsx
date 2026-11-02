"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  HeartHandshake,
  LayoutDashboard,
  UtensilsCrossed,
  Building2,
  Truck,
  ShieldAlert,
  GitCompare,
  Database,
  LogIn,
  LogOut,
  RefreshCw,
} from "lucide-react";
import StatusBadge from "./StatusBadge";

interface UserSession {
  id: number;
  email: string;
  fullName: string;
  role: "ADMIN" | "DONOR" | "NGO" | "VOLUNTEER";
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);

  const fetchSession = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (e) {
      console.error("Session check error:", e);
    }
  };

  useEffect(() => {
    fetchSession();
  }, [pathname]);

  const handleQuickSwitch = async (role: string) => {
    try {
      setIsSwitching(true);
      const res = await fetch("/api/auth/quick-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        // Navigate to the role's preferred dashboard
        if (role === "DONOR") router.push("/donor");
        else if (role === "NGO") router.push("/ngo");
        else if (role === "VOLUNTEER") router.push("/volunteer");
        else if (role === "ADMIN") router.push("/admin");
        router.refresh();
      }
    } catch (e) {
      console.error("Quick switch error:", e);
    } finally {
      setIsSwitching(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      router.push("/login");
      router.refresh();
    } catch (e) {
      console.error("Logout error:", e);
    }
  };

  const navLinks = [
    { href: "/", label: "Overview", icon: LayoutDashboard },
    { href: "/donor", label: "Donor Portal", icon: UtensilsCrossed },
    { href: "/ngo", label: "NGO Portal", icon: Building2 },
    { href: "/volunteer", label: "Volunteer Portal", icon: Truck },
    { href: "/admin", label: "Admin Portal", icon: ShieldAlert },
    { href: "/matching", label: "Smart Matching", icon: GitCompare },
    { href: "/analytics", label: "DBMS & Audit", icon: Database },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and System Title */}
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2 text-emerald-600 hover:text-emerald-700">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-200">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight text-slate-900 block leading-tight">
                  Food<span className="text-emerald-600">Bridge</span>
                </span>
                <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                  DBMS Level 3 Academic Project
                </span>
              </div>
            </Link>
          </div>

          {/* Main Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-emerald-600" : "text-slate-400"}`} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Quick Role Switcher & User Session Actions */}
          <div className="flex items-center space-x-3">
            {/* 1-Click Role Switcher for Academic Viva */}
            <div className="hidden sm:flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200 text-xs">
              <span className="text-slate-400 px-1 font-semibold flex items-center">
                <RefreshCw className={`w-3 h-3 mr-1 ${isSwitching ? "animate-spin" : ""}`} />
                Role:
              </span>
              {(["ADMIN", "DONOR", "NGO", "VOLUNTEER"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => handleQuickSwitch(r)}
                  disabled={isSwitching}
                  className={`px-2 py-1 rounded font-medium transition-all cursor-pointer ${
                    user?.role === r
                      ? "bg-white text-emerald-700 shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                  }`}
                  title={`Instantly test application as ${r}`}
                >
                  {r}
                </button>
              ))}
            </div>

            {user ? (
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
                <div className="text-right hidden md:block">
                  <div className="text-xs font-semibold text-slate-800 leading-tight">
                    {user.fullName}
                  </div>
                  <div className="mt-0.5">
                    <StatusBadge status={user.role} type="role" />
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 shadow-sm transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span>Login</span>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex lg:hidden overflow-x-auto py-2 space-x-2 border-t border-slate-100 scrollbar-none">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium ${
                  isActive ? "bg-emerald-100 text-emerald-800" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
