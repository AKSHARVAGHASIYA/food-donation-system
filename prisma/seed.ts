import { PrismaClient, UserRole, DonorType, FoodCategory, FoodUnit, DietaryType, StorageRequirement, ListingStatus, VulnerabilityType, RequestUrgency, RequestStatus, AllocationStatus, VehicleType, VolunteerStatus, PickupStatus, DistributionStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { MongoClient } from "mongodb";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Database Seed for Food Donation & Distribution System...");

  // 1. Clean existing records in relational tables (in reverse foreign-key order)
  await prisma.distribution.deleteMany();
  await prisma.pickup.deleteMany();
  await prisma.requestAllocation.deleteMany();
  await prisma.foodRequest.deleteMany();
  await prisma.beneficiaryGroup.deleteMany();
  await prisma.foodListing.deleteMany();
  await prisma.volunteer.deleteMany();
  await prisma.ngo.deleteMany();
  await prisma.foodDonor.deleteMany();
  await prisma.user.deleteMany();

  console.log("Cleared existing MySQL relational data.");

  // 2. Hash passwords
  const adminPasswordHash = await bcrypt.hash("Admin@123", 10);
  const donorPasswordHash = await bcrypt.hash("Donor@123", 10);
  const ngoPasswordHash = await bcrypt.hash("Ngo@123", 10);
  const volPasswordHash = await bcrypt.hash("Volunteer@123", 10);

  // 3. Create Users & Profiles
  // 3a. Admin
  const adminUser = await prisma.user.create({
    data: {
      email: "admin@foodbridge.org",
      password_hash: adminPasswordHash,
      full_name: "Dr. Arvind Mehta (System Admin)",
      phone: "+91 98765 00001",
      role: UserRole.ADMIN,
      city: "Mumbai",
      address: "Central Disaster Management Hub, Nariman Point",
    },
  });

  // 3b. Donors
  const donorUser1 = await prisma.user.create({
    data: {
      email: "grandkitchen@gmail.com",
      password_hash: donorPasswordHash,
      full_name: "Chef Rajesh Kapoor",
      phone: "+91 98765 11001",
      role: UserRole.DONOR,
      city: "Mumbai",
      address: "Grand Kitchen Banquet & Restaurant, Bandra West",
      donorProfile: {
        create: {
          donor_type: DonorType.RESTAURANT,
          organization_name: "Grand Kitchen Hospitality",
          fssai_license: "FSSAI-11520023000451",
          pickup_address: "Loading Bay 2, Behind Grand Kitchen, Linking Road, Bandra West",
          contact_person: "Rajesh Kapoor (Head Chef)",
        },
      },
    },
    include: { donorProfile: true },
  });

  const donorUser2 = await prisma.user.create({
    data: {
      email: "freshmart@gmail.com",
      password_hash: donorPasswordHash,
      full_name: "Sunil Grover",
      phone: "+91 98765 11002",
      role: UserRole.DONOR,
      city: "Mumbai",
      address: "FreshMart Hypermarket, Andheri East",
      donorProfile: {
        create: {
          donor_type: DonorType.SUPERMARKET,
          organization_name: "FreshMart Retail Ltd",
          fssai_license: "FSSAI-11521098000892",
          pickup_address: "FreshMart Logistics Gate 4, Western Express Highway, Andheri East",
          contact_person: "Sunil Grover (Store Ops Manager)",
        },
      },
    },
    include: { donorProfile: true },
  });

  // 3c. NGOs
  const ngoUser1 = await prisma.user.create({
    data: {
      email: "hopefoundation@gmail.com",
      password_hash: ngoPasswordHash,
      full_name: "Sister Mary Fernandez",
      phone: "+91 98765 22001",
      role: UserRole.NGO,
      city: "Mumbai",
      address: "Hope For All Community Center, Dharavi",
      ngoProfile: {
        create: {
          ngo_name: "Hope For All Foundation",
          registration_number: "NGO-MH-2015-88392",
          darpan_id: "MH/2018/019284",
          service_area: "Dharavi, Sion, Kurla Slum Clusters",
          contact_person: "Sister Mary Fernandez",
          capacity_people_fed: 450,
        },
      },
    },
    include: { ngoProfile: true },
  });

  const ngoUser2 = await prisma.user.create({
    data: {
      email: "annaseva@gmail.com",
      password_hash: ngoPasswordHash,
      full_name: "Vikram Singhania",
      phone: "+91 98765 22002",
      role: UserRole.NGO,
      city: "Mumbai",
      address: "Anna Seva Charitable Trust, Dadar",
      ngoProfile: {
        create: {
          ngo_name: "Anna Seva Charitable Trust",
          registration_number: "NGO-MH-2019-33019",
          darpan_id: "MH/2020/023910",
          service_area: "Dadar, Parel, Lower Parel Elderly & Shelter Homes",
          contact_person: "Vikram Singhania",
          capacity_people_fed: 300,
        },
      },
    },
    include: { ngoProfile: true },
  });

  // 3d. Volunteers
  const volUser1 = await prisma.user.create({
    data: {
      email: "rahul.volunteer@gmail.com",
      password_hash: volPasswordHash,
      full_name: "Rahul Sharma",
      phone: "+91 98765 33001",
      role: UserRole.VOLUNTEER,
      city: "Mumbai",
      address: "Santacruz East, Mumbai",
      volunteerProfile: {
        create: {
          vehicle_type: VehicleType.BIKE,
          license_number: "MH-02-2021-998811",
          availability_status: VolunteerStatus.AVAILABLE,
          operating_city: "Mumbai",
          max_cargo_capacity_kg: 25.0,
          deliveries_completed: 18,
          rating: 4.95,
        },
      },
    },
    include: { volunteerProfile: true },
  });

  const volUser2 = await prisma.user.create({
    data: {
      email: "priya.volunteer@gmail.com",
      password_hash: volPasswordHash,
      full_name: "Priya Patel",
      phone: "+91 98765 33002",
      role: UserRole.VOLUNTEER,
      city: "Mumbai",
      address: "Chembur, Mumbai",
      volunteerProfile: {
        create: {
          vehicle_type: VehicleType.VAN,
          license_number: "MH-03-2019-445522",
          availability_status: VolunteerStatus.AVAILABLE,
          operating_city: "Mumbai",
          max_cargo_capacity_kg: 250.0,
          deliveries_completed: 34,
          rating: 4.98,
        },
      },
    },
    include: { volunteerProfile: true },
  });

  // 4. Beneficiary Groups
  const bg1 = await prisma.beneficiaryGroup.create({
    data: {
      ngo_id: ngoUser1.ngoProfile!.id,
      group_name: "Sunshine Slum Cluster Community",
      location: "Sector 5, Dharavi Transit Camp",
      target_headcount: 140,
      vulnerability_type: VulnerabilityType.LOW_INCOME_COMMUNITY,
      contact_representative: "Amina Begum (Community Leader)",
      notes: "Daily wage families with children; urgent need for hot cooked meals and milk.",
    },
  });

  const bg2 = await prisma.beneficiaryGroup.create({
    data: {
      ngo_id: ngoUser2.ngoProfile!.id,
      group_name: "Shanti Old Age Care Home",
      location: "Lane 3, Near Shivaji Park, Dadar West",
      target_headcount: 65,
      vulnerability_type: VulnerabilityType.ELDERLY_CARE,
      contact_representative: "Dr. K. R. Nambiar",
      notes: "Senior citizens; need nutritious, low-spice vegetarian food and bakery supplies.",
    },
  });

  const bg3 = await prisma.beneficiaryGroup.create({
    data: {
      ngo_id: ngoUser1.ngoProfile!.id,
      group_name: "Aasha Children Orphanage",
      location: "Kurla West, Near Station",
      target_headcount: 85,
      vulnerability_type: VulnerabilityType.CHILDREN_ORPHANAGE,
      contact_representative: "Sister Teresa",
      notes: "Shelter home for 85 children aged 4-16.",
    },
  });

  // 5. Food Listings
  const inThreeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const inOneDay = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);
  const inFiveDays = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

  // Listing 1: Cooked Meals (Partially Allocated)
  const listing1 = await prisma.foodListing.create({
    data: {
      donor_id: donorUser1.donorProfile!.id,
      title: "60 Fresh Packaged Meal Boxes (Veg Biryani + Cucumber Raita)",
      food_category: FoodCategory.COOKED_MEALS,
      quantity: 60.0,
      available_quantity: 25.0, // 35 will be allocated to Request 1
      unit: FoodUnit.MEALS,
      expiry_date: inOneDay,
      dietary_type: DietaryType.VEGETARIAN,
      storage_requirement: StorageRequirement.HEATED,
      status: ListingStatus.PARTIALLY_ALLOCATED,
      pickup_address: "Loading Bay 2, Behind Grand Kitchen, Bandra West",
      city: "Mumbai",
      special_notes: "Freshly prepared from today's afternoon banquet. Sealed in insulated thermal containers.",
    },
  });

  // Listing 2: Bakery Items (Available)
  const listing2 = await prisma.foodListing.create({
    data: {
      donor_id: donorUser2.donorProfile!.id,
      title: "80 Loaves Multigrain Sliced Bread & Fruit Buns",
      food_category: FoodCategory.BAKERY,
      quantity: 80.0,
      available_quantity: 80.0,
      unit: FoodUnit.PACKETS,
      expiry_date: inThreeDays,
      dietary_type: DietaryType.VEGETARIAN,
      storage_requirement: StorageRequirement.ROOM_TEMPERATURE,
      status: ListingStatus.AVAILABLE,
      pickup_address: "FreshMart Logistics Gate 4, Andheri East",
      city: "Mumbai",
      special_notes: "Surplus morning batch from in-store bakery. Hygienically sealed.",
    },
  });

  // Listing 3: Produce / Fruits (Available)
  const listing3 = await prisma.foodListing.create({
    data: {
      donor_id: donorUser2.donorProfile!.id,
      title: "50 kg Fresh Apples, Bananas & Seasonal Oranges",
      food_category: FoodCategory.PRODUCE_FRUITS_VEG,
      quantity: 50.0,
      available_quantity: 50.0,
      unit: FoodUnit.KG,
      expiry_date: inThreeDays,
      dietary_type: DietaryType.VEGAN,
      storage_requirement: StorageRequirement.ROOM_TEMPERATURE,
      status: ListingStatus.AVAILABLE,
      pickup_address: "FreshMart Logistics Gate 4, Andheri East",
      city: "Mumbai",
      special_notes: "Crated fresh fruits suitable for children's home or elderly shelter.",
    },
  });

  // Listing 4: Raw Ingredients (Available)
  const listing4 = await prisma.foodListing.create({
    data: {
      donor_id: donorUser1.donorProfile!.id,
      title: "100 kg Premium Basmati Rice & Toor Dal Packets",
      food_category: FoodCategory.RAW_INGREDIENTS,
      quantity: 100.0,
      available_quantity: 100.0,
      unit: FoodUnit.KG,
      expiry_date: inFiveDays,
      dietary_type: DietaryType.VEGAN,
      storage_requirement: StorageRequirement.ROOM_TEMPERATURE,
      status: ListingStatus.AVAILABLE,
      pickup_address: "Loading Bay 2, Grand Kitchen, Bandra West",
      city: "Mumbai",
      special_notes: "Unopened sealed 10kg bags.",
    },
  });

  // 6. Food Requests
  // Request 1: Cooked Meals for Sunshine Slum (35 meals needed, will be fulfilled by Listing 1)
  const req1 = await prisma.foodRequest.create({
    data: {
      ngo_id: ngoUser1.ngoProfile!.id,
      beneficiary_group_id: bg1.id,
      requested_food_category: FoodCategory.COOKED_MEALS,
      required_quantity: 35.0,
      fulfilled_quantity: 35.0,
      unit: FoodUnit.MEALS,
      urgency_level: RequestUrgency.HIGH,
      status: RequestStatus.FULFILLED,
      needed_by: inOneDay,
      delivery_address: "Community Kitchen, Sector 5, Dharavi Transit Camp",
      city: "Mumbai",
      notes: "Lunch distribution for children & elderly residents.",
    },
  });

  // Request 2: Bakery items for Shanti Elderly Home (Pending)
  const req2 = await prisma.foodRequest.create({
    data: {
      ngo_id: ngoUser2.ngoProfile!.id,
      beneficiary_group_id: bg2.id,
      requested_food_category: FoodCategory.BAKERY,
      required_quantity: 50.0,
      fulfilled_quantity: 0.0,
      unit: FoodUnit.PACKETS,
      urgency_level: RequestUrgency.MEDIUM,
      status: RequestStatus.PENDING,
      needed_by: inThreeDays,
      delivery_address: "Lane 3, Shivaji Park, Dadar West",
      city: "Mumbai",
      notes: "Breakfast breakfast bread supplies for 65 seniors.",
    },
  });

  // Request 3: Raw Ingredients for Aasha Orphanage (Pending)
  const req3 = await prisma.foodRequest.create({
    data: {
      ngo_id: ngoUser1.ngoProfile!.id,
      beneficiary_group_id: bg3.id,
      requested_food_category: FoodCategory.RAW_INGREDIENTS,
      required_quantity: 60.0,
      fulfilled_quantity: 0.0,
      unit: FoodUnit.KG,
      urgency_level: RequestUrgency.CRITICAL,
      status: RequestStatus.PENDING,
      needed_by: inThreeDays,
      delivery_address: "Aasha Orphanage Premises, Kurla West",
      city: "Mumbai",
      notes: "Monthly ration stock depleted; urgent raw staples required.",
    },
  });

  // 7. Request Allocation (Junction Table: REQUEST_ALLOCATION)
  const alloc1 = await prisma.requestAllocation.create({
    data: {
      request_id: req1.id,
      listing_id: listing1.id,
      allocated_quantity: 35.0,
      allocation_status: AllocationStatus.DISPATCHED,
      allocated_by_user_id: adminUser.id,
      allocated_at: new Date(Date.now() - 4 * 60 * 60 * 1000),
    },
  });

  // 8. Pickup Logistics
  const pickup1 = await prisma.pickup.create({
    data: {
      allocation_id: alloc1.id,
      listing_id: listing1.id,
      volunteer_id: volUser1.volunteerProfile!.id,
      pickup_time_scheduled: new Date(Date.now() - 3 * 60 * 60 * 1000),
      actual_pickup_time: new Date(Date.now() - 2 * 60 * 60 * 1000),
      pickup_status: PickupStatus.DELIVERED_TO_HUB,
      quantity_collected: 35.0,
      donor_signature_name: "Chef Rajesh Kapoor",
      verification_otp: "749201",
      notes: "Collected 35 insulated food containers in perfect temperature.",
    },
  });

  // 9. Distribution Record
  await prisma.distribution.create({
    data: {
      allocation_id: alloc1.id,
      ngo_id: ngoUser1.ngoProfile!.id,
      beneficiary_group_id: bg1.id,
      distribution_date: new Date(Date.now() - 1 * 60 * 60 * 1000),
      distributed_quantity: 35.0,
      beneficiaries_served_count: 140,
      distribution_status: DistributionStatus.DISTRIBUTED,
      received_by_person: "Sister Mary Fernandez",
      verification_signature: "Mary Fernandez (Dir)",
      feedback_notes: "Distributed to 140 children and elderly families. Excellent condition.",
    },
  });

  console.log("✅ Seeded MySQL relational database successfully!");

  // 10. Seed MongoDB Activity / Audit Logs
  try {
    const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/food_donation_audit";
    const mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    const db = mongoClient.db("food_donation_audit");
    const auditColl = db.collection("audit_events");

    // Clear existing logs
    await auditColl.deleteMany({});

    const sampleAuditLogs = [
      {
        action: "USER_REGISTERED",
        userId: adminUser.id,
        userEmail: adminUser.email,
        role: "ADMIN",
        entityType: "USER",
        entityId: adminUser.id,
        details: { message: "System administrator account initialized." },
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
      {
        action: "USER_REGISTERED",
        userId: donorUser1.id,
        userEmail: donorUser1.email,
        role: "DONOR",
        entityType: "FOOD_DONOR",
        entityId: donorUser1.donorProfile!.id,
        details: { organization: "Grand Kitchen Banquet", fssai: "FSSAI-11520023000451" },
        timestamp: new Date(Date.now() - 20 * 60 * 60 * 1000),
      },
      {
        action: "USER_LOGIN",
        userId: donorUser1.id,
        userEmail: donorUser1.email,
        role: "DONOR",
        entityType: "USER",
        entityId: donorUser1.id,
        details: { ip: "127.0.0.1", userAgent: "Mozilla/5.0" },
        timestamp: new Date(Date.now() - 18 * 60 * 60 * 1000),
      },
      {
        action: "DONATION_CREATED",
        userId: donorUser1.id,
        userEmail: donorUser1.email,
        role: "DONOR",
        entityType: "FOOD_LISTING",
        entityId: listing1.id,
        details: { title: listing1.title, quantity: 60.0, category: "COOKED_MEALS" },
        timestamp: new Date(Date.now() - 16 * 60 * 60 * 1000),
      },
      {
        action: "REQUEST_SUBMITTED",
        userId: ngoUser1.id,
        userEmail: ngoUser1.email,
        role: "NGO",
        entityType: "FOOD_REQUEST",
        entityId: req1.id,
        details: { requested_quantity: 35.0, urgency: "HIGH", category: "COOKED_MEALS" },
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
      },
      {
        action: "ALLOCATION_TRANSACTION",
        userId: adminUser.id,
        userEmail: adminUser.email,
        role: "ADMIN",
        entityType: "REQUEST_ALLOCATION",
        entityId: alloc1.id,
        details: {
          requestId: req1.id,
          listingId: listing1.id,
          allocatedQuantity: 35.0,
          remainingStock: 25.0,
          status: "RESERVED",
        },
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      },
      {
        action: "PICKUP_ASSIGNED",
        userId: volUser1.id,
        userEmail: volUser1.email,
        role: "VOLUNTEER",
        entityType: "PICKUP",
        entityId: pickup1.id,
        details: { volunteerName: "Rahul Sharma", vehicle: "BIKE" },
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
      },
      {
        action: "PICKUP_STATUS_UPDATED",
        userId: volUser1.id,
        userEmail: volUser1.email,
        role: "VOLUNTEER",
        entityType: "PICKUP",
        entityId: pickup1.id,
        details: { oldStatus: "ASSIGNED", newStatus: "DELIVERED_TO_HUB", quantity: 35.0 },
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
      {
        action: "DISTRIBUTION_RECORDED",
        userId: ngoUser1.id,
        userEmail: ngoUser1.email,
        role: "NGO",
        entityType: "DISTRIBUTION",
        entityId: 1,
        details: {
          beneficiariesServed: 140,
          quantity: 35.0,
          targetGroup: "Sunshine Slum Cluster Community",
        },
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
      },
    ];

    await auditColl.insertMany(sampleAuditLogs);
    await mongoClient.close();
    console.log("✅ Seeded MongoDB audit events & activity logs successfully!");
  } catch (mongoErr) {
    console.warn("⚠️ Note: MongoDB seed warning (MongoDB may not be running or accessible):", mongoErr);
  }

  console.log("\n=======================================================");
  console.log("🎉 Seed Completed Successfully! Demo Credentials:");
  console.log("-------------------------------------------------------");
  console.log("Role: ADMIN     | Email: admin@foodbridge.org       | Pass: Admin@123");
  console.log("Role: DONOR     | Email: grandkitchen@gmail.com     | Pass: Donor@123");
  console.log("Role: DONOR     | Email: freshmart@gmail.com        | Pass: Donor@123");
  console.log("Role: NGO       | Email: hopefoundation@gmail.com   | Pass: Ngo@123");
  console.log("Role: NGO       | Email: annaseva@gmail.com         | Pass: Ngo@123");
  console.log("Role: VOLUNTEER | Email: rahul.volunteer@gmail.com  | Pass: Volunteer@123");
  console.log("Role: VOLUNTEER | Email: priya.volunteer@gmail.com  | Pass: Volunteer@123");
  console.log("=======================================================\n");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
