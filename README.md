# Food Donation and Distribution Management System (FoodBridge)
**DBMS Level 3 Academic Project & Full Implementation**

---

## 📌 Executive Summary

The **Food Donation and Distribution Management System** is an enterprise-grade academic DBMS application designed to minimize food waste and optimize urban food distribution. It links food donors (restaurants, supermarkets, caterers) with welfare organizations (NGOs, community kitchens, shelter homes) through verified volunteer logistics agents.

Built on **MySQL 8.0** with **Prisma ORM**, **Next.js (App Router, TypeScript, Tailwind CSS)**, and **MongoDB** for audit event logging and aggregation analytics.

---

## 🏗️ Relational Architecture & The 10 Entities

The system implements the 10 required relational entities in Third Normal Form (3NF) with primary keys, foreign keys, non-null checks, positive-quantity constraints, and enums:

1. **`USER`**: Master account entity with unique emails, bcrypt hashed passwords, role-based authorization (`ADMIN`, `DONOR`, `NGO`, `VOLUNTEER`), and account status (`ACTIVE`, `PENDING_VERIFICATION`, `SUSPENDED`).
2. **`FOOD_DONOR`**: Extends user profiles for food businesses; stores donor type (`RESTAURANT`, `SUPERMARKET`, etc.), organization name, FSSAI food safety license, pickup address, and contact details.
3. **`FOOD_LISTING`**: Surplus food batches posted by donors; tracks initial quantity, current `available_quantity`, unit (`MEALS`, `KG`, `PACKETS`, `LITERS`), expiry timestamp, dietary classification, storage temperature requirements, and status.
4. **`NGO`**: Welfare organization profiles; contains NGO registration number, DARPAN ID, service coverage areas, verification status, and daily feeding capacity.
5. **`BENEFICIARY_GROUP`**: Communities, orphanages, and shelter clusters adopted by NGOs; stores vulnerability type, target headcount, and local coordinates.
6. **`FOOD_REQUEST`**: Demand orders submitted by NGOs; specifies food category, required quantity, deadline (`needed_by`), delivery address, urgency (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), and fulfillment progress.
   > **Architectural Constraint:** `listing_id` is **never** stored directly in `FOOD_REQUEST`. Instead, the junction entity `REQUEST_ALLOCATION` is used.
7. **`REQUEST_ALLOCATION` (Junction Table)**: Connects `FOOD_REQUEST` and `FOOD_LISTING` in an $M:N$ relationship. One request may be satisfied across multiple listing batches, and one large donor batch can satisfy multiple community requests. Stores `allocated_quantity` and `allocation_status` (`RESERVED`, `DISPATCHED`, `DELIVERED`, `CANCELLED`).
8. **`VOLUNTEER`**: Delivery agents; tracks vehicle type (`BIKE`, `VAN`, `REFRIGERATED_TRUCK`), cargo capacity, completed delivery count, and ratings.
9. **`PICKUP`**: Physical transit logistics task; generated automatically upon stock allocation. Contains scheduled collection time, verification OTP for donor handover, recipient signature, and status stepper (`SCHEDULED` &rarr; `ASSIGNED` &rarr; `EN_ROUTE_TO_PICKUP` &rarr; `PICKED_UP` &rarr; `DELIVERED_TO_HUB`).
10. **`DISTRIBUTION`**: Final welfare fulfillment record; logs actual distributed food quantity, verified beneficiary headcount served, recipient signature, and quality feedback.

---

## ⚡ Advanced DBMS Concepts Implemented

### 1. ACID Transactions (Over-Allocation Prevention)
Stock allocation is strictly isolated through **interactive database transactions** and MySQL row locking (`SELECT ... FOR UPDATE`).
- If an allocation attempts to draw more quantity than `available_quantity`, the transaction rolls back.
- If an allocation attempts to exceed remaining required quantity on the request, the transaction rolls back.
- Available listing stock is deducted, request fulfilled quantity is incremented, and status flags (`PARTIALLY_ALLOCATED`, `FULLY_ALLOCATED`, `PARTIALLY_FULFILLED`, `FULFILLED`) are updated atomically.

### 2. Database Views (Virtual Abstraction Tables)
Four production views are implemented in MySQL:
- **`v_pending_fulfillments`**: Aggregates unfulfilled requests with NGO contacts and beneficiary group details, ordered by urgency priority.
- **`v_donor_contribution_summary`**: Summarizes cumulative donation metrics per donor using `COUNT()`, `SUM()`, `COALESCE()`, and `GROUP BY`.
- **`v_ngo_request_status`**: Calculates percentage fulfillment rates and volume demand per NGO.
- **`v_volunteer_logistics_load`**: Aggregates active deliveries, ratings, and performance counters for volunteer dispatch.

### 3. Stored Procedures and Functions
- **`sp_allocate_food_stock`**: Stored procedure taking request ID, listing ID, allocation quantity, and coordinator ID. Implements row-level locking, expiry verification, inventory checks, allocation creation, and automated pickup generation inside an atomic block with `DECLARE EXIT HANDLER FOR SQLEXCEPTION`.
- **`fn_calculate_listing_remaining_qty(p_listing_id)`**: Deterministic scalar function returning real-time remaining stock for any listing.
- **`fn_ngo_fulfillment_rate(p_ngo_id)`**: Calculates percentage fulfillment for any NGO.

### 4. Database Triggers
- **`trg_prevent_negative_inventory`**: `BEFORE UPDATE` trigger on `food_listings`. If `NEW.available_quantity < 0`, raises `SIGNAL SQLSTATE '45000'` to reject the update.
- **`trg_prevent_expired_allocation`**: `BEFORE INSERT` trigger on `request_allocations`. Blocks creating allocations for food listings whose expiry date has passed.
- **`trg_update_volunteer_deliveries_count`**: `AFTER UPDATE` trigger on `pickups`. Automatically increments `volunteers.deliveries_completed` when `pickup_status` updates to `'DELIVERED_TO_HUB'`.

### 5. Multi-Table Analytical Demonstration Queries
Located in `sql/analytical_demonstration_queries.sql` and executable directly in the UI under `/analytics`:
- Multi-table `INNER JOIN` + `LEFT JOIN` with `GROUP BY`, `HAVING`, and aggregate functions (`SUM`, `AVG`, `MIN`, `MAX`).
- Correlated subqueries comparing item quantity against dynamic category averages.
- 5-table traceability join from donor to recipient.
- Multi-factor smart matching query.

### 6. MongoDB Activity Logs & Aggregation Pipelines
Polyglot persistence for immutable event streams:
- Collection `audit_events` logs every critical action (`USER_LOGIN`, `DONATION_CREATED`, `REQUEST_SUBMITTED`, `ALLOCATION_TRANSACTION`, `PICKUP_STATUS_UPDATED`, `DISTRIBUTION_RECORDED`).
- Aggregation Pipeline 1: Action frequency distribution via `$group` and `$sort`.
- Aggregation Pipeline 2: User role activity breakdown.
- Aggregation Pipeline 3: Daily activity timelines using `$dateToString`.

---

## 🔑 Demo User Credentials

All passwords are encrypted with bcrypt (10 rounds):

| Role | Email Address | Password | Profile Description |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@foodbridge.org` | `Admin@123` | System Coordinator (Dr. Arvind Mehta) |
| **DONOR** | `grandkitchen@gmail.com` | `Donor@123` | Grand Kitchen Banquet & Restaurant |
| **DONOR** | `freshmart@gmail.com` | `Donor@123` | FreshMart Hypermarket |
| **NGO** | `hopefoundation@gmail.com` | `Ngo@123` | Hope For All Foundation (Sister Mary) |
| **NGO** | `annaseva@gmail.com` | `Ngo@123` | Anna Seva Charitable Trust |
| **VOLUNTEER** | `rahul.volunteer@gmail.com` | `Volunteer@123` | Rahul Sharma (Bike Courier) |
| **VOLUNTEER** | `priya.volunteer@gmail.com` | `Volunteer@123` | Priya Patel (Van Logistics) |

> **Evaluator Tip:** The top navigation bar includes an **Instant Role Switcher** widget that allows 1-click switching between Admin, Donor, NGO, and Volunteer without manual re-login.

---

## 🚀 Setup & Execution Instructions

### 1. Prerequisites
- **Node.js**: v20+
- **MySQL**: 8.0+ running on port `3306`
- **MongoDB**: 6.0+ running on port `27017`

### 2. Environment Configuration
Copy `.env.example` to `.env` and specify credentials:
```bash
cp .env.example .env
```
Default local settings:
```env
DATABASE_URL="mysql://root:@localhost:3306/food_donation_db"
MONGODB_URI="mongodb://127.0.0.1:27017/food_donation_audit"
JWT_SECRET="btech_dbms_level3_food_donation_super_secret_jwt_key_9843"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

### 3. Initialize Databases & Apply Advanced Features
```bash
# 1. Create MySQL database (if not exists)
mysql -u root -e "CREATE DATABASE IF NOT EXISTS food_donation_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2. Push relational schema to MySQL and generate Prisma Client
npx prisma db push

# 3. Apply Advanced SQL (Views, Stored Procedures, Functions, Triggers)
mysql -u root food_donation_db < prisma/sql/advanced_dbms_features.sql

# 4. Seed database with realistic sample data & MongoDB audit logs
npx prisma db seed
```

### 4. Run Automated Test Suite
```bash
npm test
```
Verifies table structures, bcrypt hashing, view queries, ACID over-allocation aborts, triggers, and MongoDB aggregation pipelines.

### 5. Launch Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 📂 Project Directory Structure

```
food-donation-system/
├── prisma/
│   ├── schema.prisma                       # Complete 10-entity Prisma Schema
│   ├── seed.ts                             # Database seed (MySQL + MongoDB)
│   ├── migrations/0_init/migration.sql    # Standard relational migration SQL
│   └── sql/
│       └── advanced_dbms_features.sql      # Views, Stored Procedures, Triggers
├── sql/
│   └── analytical_demonstration_queries.sql# Complex queries with JOIN, GROUP BY, Subqueries
├── src/
│   ├── app/
│   │   ├── layout.tsx                      # Root Layout with Navbar & Metadata
│   │   ├── page.tsx                        # Overview & Landing page with Live Stats
│   │   ├── login/page.tsx                  # Role-based Login with 1-click Quick Fill
│   │   ├── donor/page.tsx                  # Donor Dashboard (Post & Manage Listings)
│   │   ├── ngo/page.tsx                    # NGO Dashboard (Requests, Beneficiaries, Distribution)
│   │   ├── volunteer/page.tsx              # Volunteer Logistics (Pickup Stepper & OTP Handover)
│   │   ├── admin/page.tsx                  # Master Governance & Transactional Stock Allocator
│   │   ├── matching/page.tsx               # Smart Compatibility Matrix & 1-Click Allocation
│   │   ├── analytics/page.tsx              # Live SQL Runner, Views & MongoDB Aggregations
│   │   └── api/                            # RESTful Server-Side Authorized Endpoints
│   │       ├── auth/                       # Login, Logout, Me, Quick-Switch
│   │       ├── listings/                   # Food Listings CRUD
│   │       ├── requests/                   # Food Requests CRUD
│   │       ├── allocations/                # ACID Transactional Stock Allocation
│   │       ├── pickups/                    # Volunteer Transport & OTP Handover
│   │       ├── distributions/              # Beneficiary Distribution Logger
│   │       ├── beneficiaries/              # Beneficiary Community Management
│   │       ├── matching/                   # Heuristic Compatibility Algorithm
│   │       └── analytics/                  # Summary Stats & Live SQL Execution Runner
│   ├── components/
│   │   ├── Navbar.tsx                      # Header with Quick Role Switcher
│   │   └── StatusBadge.tsx                 # Enum Color-Token Status Badges
│   └── lib/
│       ├── prisma.ts                       # MySQL Prisma Client Singleton
│       ├── mongodb.ts                      # MongoDB Native Client Singleton
│       ├── auth.ts                         # Bcrypt & JWT Authorization Guard
│       └── audit.ts                        # MongoDB Audit Logger & Aggregations
├── tests/
│   └── system_verification.ts              # Automated Verification Suite (6/6 passing)
├── .env.example                            # Placeholder Configuration Template
├── package.json                            # Scripts & Dependencies
└── README.md                               # Academic Project Documentation
```
