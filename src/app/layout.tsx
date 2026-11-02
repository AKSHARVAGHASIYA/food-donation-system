import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FoodBridge | Food Donation and Distribution Management System",
  description:
    "A complete DBMS Level 3 academic project featuring MySQL relational architecture, Prisma ORM, MongoDB activity audit trails, ACID stock allocation transactions, Views, Triggers, and Stored Procedures.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans">
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-2">
            <p className="font-semibold text-slate-700">
              Food Donation and Distribution Management System &bull; B.Tech DBMS Level 3 Project
            </p>
            <p>
              Architected with MySQL (Prisma ORM), MongoDB Audit Events, ACID Transactions, Stored Procedures, Views & Triggers.
            </p>
            <div className="flex justify-center space-x-6 text-slate-400 pt-1">
              <span>MySQL 8.0 Relational Core</span>
              <span>&bull;</span>
              <span>10 Entities Junction Model</span>
              <span>&bull;</span>
              <span>MongoDB Aggregation Pipelines</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
