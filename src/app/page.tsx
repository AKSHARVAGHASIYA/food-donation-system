import Link from "next/link";
import prisma from "@/lib/prisma";
import {
  UtensilsCrossed,
  Building2,
  Truck,
  ShieldCheck,
  GitCompare,
  Database,
  ArrowRight,
  Layers,
  Sparkles,
  CheckCircle2,
  Lock,
  Workflow,
  Eye,
  Zap,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Fetch live stats from MySQL
  const [
    donorsCount,
    ngosCount,
    volunteersCount,
    listingsCount,
    requestsCount,
    allocationsCount,
    distributionsCount,
  ] = await Promise.all([
    prisma.foodDonor.count(),
    prisma.ngo.count(),
    prisma.volunteer.count(),
    prisma.foodListing.count(),
    prisma.foodRequest.count(),
    prisma.requestAllocation.count(),
    prisma.distribution.count(),
  ]);

  const listingSums = await prisma.foodListing.aggregate({
    _sum: { quantity: true, available_quantity: true },
  });

  const distSums = await prisma.distribution.aggregate({
    _sum: { distributed_quantity: true, beneficiaries_served_count: true },
  });

  const totalDonated = Number(listingSums._sum.quantity || 0);
  const totalAvailable = Number(listingSums._sum.available_quantity || 0);
  const totalDistributed = Number(distSums._sum.distributed_quantity || 0);
  const totalServed = Number(distSums._sum.beneficiaries_served_count || 0);

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50/80 via-white to-slate-50 border-b border-slate-200 py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold uppercase tracking-wider mb-6">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>DBMS Level 3 Academic Project &bull; Full Implementation</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Food Donation & Distribution <br className="hidden sm:inline" />
            <span className="text-emerald-600">Management System</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            A comprehensive, multi-tier database application bridging food donors, welfare NGOs, and volunteer logistics.
            Engineered with <strong className="text-slate-800">MySQL relational architecture</strong>,{" "}
            <strong className="text-slate-800">Prisma ORM</strong>,{" "}
            <strong className="text-slate-800">MongoDB activity audit logging</strong>, and advanced DBMS concepts including ACID transactions, stored procedures, triggers, and views.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/matching"
              className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-semibold shadow-md shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center space-x-2"
            >
              <GitCompare className="w-5 h-5" />
              <span>Smart Food Matching</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
            <Link
              href="/analytics"
              className="px-6 py-3 rounded-xl bg-white text-slate-800 font-semibold border border-slate-200 shadow-xs hover:bg-slate-50 transition-all flex items-center space-x-2"
            >
              <Database className="w-5 h-5 text-emerald-600" />
              <span>DBMS Features & Audit Trails</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Real-time Relational Database Metrics */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Food Donated</div>
            <div className="mt-2 text-3xl font-extrabold text-slate-900">{totalDonated.toLocaleString()} <span className="text-sm font-normal text-slate-500">units</span></div>
            <div className="mt-1 text-xs text-emerald-600 font-medium">{totalAvailable} units currently in active stock</div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Beneficiaries Fed</div>
            <div className="mt-2 text-3xl font-extrabold text-emerald-600">{totalServed.toLocaleString()} <span className="text-sm font-normal text-slate-500">people</span></div>
            <div className="mt-1 text-xs text-slate-500">{totalDistributed} units distributed via verified NGOs</div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">System Allocations</div>
            <div className="mt-2 text-3xl font-extrabold text-slate-900">{allocationsCount} <span className="text-sm font-normal text-slate-500">batches</span></div>
            <div className="mt-1 text-xs text-blue-600 font-medium">Junction table REQUEST_ALLOCATION</div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Ecosystem</div>
            <div className="mt-2 text-3xl font-extrabold text-slate-900">{donorsCount + ngosCount + volunteersCount} <span className="text-sm font-normal text-slate-500">partners</span></div>
            <div className="mt-1 text-xs text-slate-500">{donorsCount} Donors &bull; {ngosCount} NGOs &bull; {volunteersCount} Volunteers</div>
          </div>
        </div>
      </section>

      {/* Role Dashboards Portal Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Role-Based Portals</h2>
            <p className="text-sm text-slate-500">Secure server-side authorization partitioned across four core user roles</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Donor Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                <UtensilsCrossed className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Food Donors</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Restaurants, supermarkets and banquet halls create and manage food listings, specify storage needs, and monitor expiry.
              </p>
              <div className="mt-4 text-xs text-slate-500 space-y-1">
                <div className="flex items-center"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mr-1.5" /> Post food batch with expiry</div>
                <div className="flex items-center"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mr-1.5" /> Track remaining available stock</div>
              </div>
            </div>
            <Link
              href="/donor"
              className="mt-6 w-full py-2 px-4 rounded-lg bg-emerald-50 text-emerald-700 font-semibold text-sm hover:bg-emerald-100 transition-colors flex items-center justify-center"
            >
              <span>Donor Portal</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Link>
          </div>

          {/* NGO Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center mb-4">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">NGO Welfare Hub</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Registered non-profits submit targeted food requests for shelters and orphanages, track fulfillment progress, and log distribution.
              </p>
              <div className="mt-4 text-xs text-slate-500 space-y-1">
                <div className="flex items-center"><CheckCircle2 className="w-3.5 h-3.5 text-sky-500 mr-1.5" /> Register beneficiary communities</div>
                <div className="flex items-center"><CheckCircle2 className="w-3.5 h-3.5 text-sky-500 mr-1.5" /> Request tracking with urgency badges</div>
              </div>
            </div>
            <Link
              href="/ngo"
              className="mt-6 w-full py-2 px-4 rounded-lg bg-sky-50 text-sky-700 font-semibold text-sm hover:bg-sky-100 transition-colors flex items-center justify-center"
            >
              <span>NGO Portal</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Link>
          </div>

          {/* Volunteer Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
                <Truck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Volunteer Logistics</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Logistics agents view assigned pickups, update status along the delivery pipeline, verify OTPs, and ensure safe transit.
              </p>
              <div className="mt-4 text-xs text-slate-500 space-y-1">
                <div className="flex items-center"><CheckCircle2 className="w-3.5 h-3.5 text-amber-500 mr-1.5" /> Stepper: Scheduled &rarr; Picked Up</div>
                <div className="flex items-center"><CheckCircle2 className="w-3.5 h-3.5 text-amber-500 mr-1.5" /> OTP verification for food handover</div>
              </div>
            </div>
            <Link
              href="/volunteer"
              className="mt-6 w-full py-2 px-4 rounded-lg bg-amber-50 text-amber-700 font-semibold text-sm hover:bg-amber-100 transition-colors flex items-center justify-center"
            >
              <span>Volunteer Portal</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Link>
          </div>

          {/* Admin Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-4">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">System Administrator</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Full governance across all 10 entities, manual & automated stock allocations, user status controls, and audit logs inspection.
              </p>
              <div className="mt-4 text-xs text-slate-500 space-y-1">
                <div className="flex items-center"><CheckCircle2 className="w-3.5 h-3.5 text-purple-500 mr-1.5" /> ACID transactional stock allocator</div>
                <div className="flex items-center"><CheckCircle2 className="w-3.5 h-3.5 text-purple-500 mr-1.5" /> Entity records governance</div>
              </div>
            </div>
            <Link
              href="/admin"
              className="mt-6 w-full py-2 px-4 rounded-lg bg-purple-50 text-purple-700 font-semibold text-sm hover:bg-purple-100 transition-colors flex items-center justify-center"
            >
              <span>Admin Portal</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Relational Database Entities (All 10 Entities) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-emerald-600 mb-2">
            <Layers className="w-4 h-4" />
            <span>Relational Architecture Specification</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">10 Core Relational Entities</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-3xl">
            Normalized relational schema adhering to 3NF principles with foreign key integrity, non-null constraints, and data type validations.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6">
            {[
              { num: "01", name: "USER", desc: "Credentials, Role, Status, Contact" },
              { num: "02", name: "FOOD_DONOR", desc: "Restaurant/Store Profile, FSSAI" },
              { num: "03", name: "FOOD_LISTING", desc: "Category, Stock, Expiry, Units" },
              { num: "04", name: "NGO", desc: "Darpan ID, Registration, Capacity" },
              { num: "05", name: "FOOD_REQUEST", desc: "Category, Urgency, Delivery" },
              { num: "06", name: "VOLUNTEER", desc: "Vehicle, Cargo, Deliveries, Rating" },
              { num: "07", name: "PICKUP", desc: "OTP Handover, Signature, Logistics" },
              { num: "08", name: "DISTRIBUTION", desc: "Beneficiaries Served, Proof" },
              { num: "09", name: "BENEFICIARY_GROUP", desc: "Shelters, Headcount, Care" },
              { num: "10", name: "REQUEST_ALLOCATION", desc: "Junction Table (M:N Relation)", highlight: true },
            ].map((ent) => (
              <div
                key={ent.num}
                className={`p-3.5 rounded-xl border text-left ${
                  ent.highlight
                    ? "bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-400"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-slate-400">{ent.num}</span>
                  {ent.highlight && (
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                      JUNCTION
                    </span>
                  )}
                </div>
                <div className="font-bold text-slate-800 text-sm mt-1">{ent.name}</div>
                <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{ent.desc}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
            <strong>DBMS Design Rule:</strong> The junction entity <code className="font-bold">REQUEST_ALLOCATION</code> decouples <code className="font-bold">FOOD_REQUEST</code> and <code className="font-bold">FOOD_LISTING</code>. One request can be fulfilled through multiple listings, and one listing can fulfill multiple requests. Over-allocation is strictly prevented at the transaction and trigger layer.
          </div>
        </div>
      </section>

      {/* Advanced DBMS Features Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">
            <Zap className="w-4 h-4" />
            <span>DBMS Advanced Concepts Implemented & Verified</span>
          </div>
          <h2 className="text-2xl font-bold">Advanced Relational & NoSQL Features</h2>
          <p className="text-slate-400 text-sm mt-1">
            Engineered specifically to satisfy academic criteria with runnable demonstrations.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
            <div className="bg-slate-800/80 p-5 rounded-xl border border-slate-700">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                <Lock className="w-4 h-4" />
                <span>ACID Transactions</span>
              </div>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Interactive transactions and MySQL row locking (`FOR UPDATE`) prevent race conditions and inventory over-allocation with automatic rollback.
              </p>
            </div>

            <div className="bg-slate-800/80 p-5 rounded-xl border border-slate-700">
              <div className="flex items-center space-x-2 text-sky-400 font-bold text-sm">
                <Eye className="w-4 h-4" />
                <span>4 Database Views</span>
              </div>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                `v_pending_fulfillments`, `v_donor_contribution_summary`, `v_ngo_request_status`, and `v_volunteer_logistics_load` provide optimized analytical abstraction.
              </p>
            </div>

            <div className="bg-slate-800/80 p-5 rounded-xl border border-slate-700">
              <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
                <Workflow className="w-4 h-4" />
                <span>Procedures & Triggers</span>
              </div>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Stored Procedure `sp_allocate_food_stock`, scalar functions, and 3 automated business triggers enforcing positive inventory and blocking expired batches.
              </p>
            </div>

            <div className="bg-slate-800/80 p-5 rounded-xl border border-slate-700">
              <div className="flex items-center space-x-2 text-purple-400 font-bold text-sm">
                <Database className="w-4 h-4" />
                <span>MongoDB Aggregations</span>
              </div>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Hybrid polyglot persistence: MongoDB audit event collections processed via multi-stage aggregation pipelines ($group, $sort, $dateToString).
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Link
              href="/analytics"
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
            >
              <span>Explore Advanced DBMS Demo & Execution Console</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
