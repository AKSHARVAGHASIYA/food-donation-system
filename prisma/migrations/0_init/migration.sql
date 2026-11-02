-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(150) NOT NULL,
    `phone` VARCHAR(50) NULL,
    `role` ENUM('ADMIN', 'DONOR', 'NGO', 'VOLUNTEER') NOT NULL DEFAULT 'DONOR',
    `status` ENUM('ACTIVE', 'PENDING_VERIFICATION', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    `address` VARCHAR(255) NULL,
    `city` VARCHAR(100) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `food_donors` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `donor_type` ENUM('INDIVIDUAL', 'RESTAURANT', 'SUPERMARKET', 'CORPORATE_CAFETERIA', 'HOTEL', 'OTHER') NOT NULL DEFAULT 'RESTAURANT',
    `organization_name` VARCHAR(150) NULL,
    `fssai_license` VARCHAR(100) NULL,
    `pickup_address` TEXT NOT NULL,
    `contact_person` VARCHAR(100) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `food_donors_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `food_listings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `donor_id` INTEGER NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `food_category` ENUM('COOKED_MEALS', 'RAW_INGREDIENTS', 'PACKAGED_FOOD', 'BAKERY', 'PRODUCE_FRUITS_VEG', 'BEVERAGES', 'DAIRY') NOT NULL,
    `quantity` DECIMAL(10, 2) NOT NULL,
    `available_quantity` DECIMAL(10, 2) NOT NULL,
    `unit` ENUM('KG', 'MEALS', 'PACKETS', 'LITERS', 'BOXES') NOT NULL DEFAULT 'MEALS',
    `expiry_date` DATETIME(3) NOT NULL,
    `dietary_type` ENUM('VEGETARIAN', 'NON_VEGETARIAN', 'VEGAN', 'CONTAINS_EGG') NOT NULL DEFAULT 'VEGETARIAN',
    `storage_requirement` ENUM('ROOM_TEMPERATURE', 'REFRIGERATED', 'FROZEN', 'HEATED') NOT NULL DEFAULT 'ROOM_TEMPERATURE',
    `status` ENUM('AVAILABLE', 'PARTIALLY_ALLOCATED', 'FULLY_ALLOCATED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'AVAILABLE',
    `pickup_address` TEXT NOT NULL,
    `city` VARCHAR(100) NOT NULL,
    `special_notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `food_listings_donor_id_idx`(`donor_id`),
    INDEX `food_listings_food_category_status_expiry_date_idx`(`food_category`, `status`, `expiry_date`),
    INDEX `food_listings_city_idx`(`city`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ngos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `ngo_name` VARCHAR(150) NOT NULL,
    `registration_number` VARCHAR(100) NOT NULL,
    `darpan_id` VARCHAR(100) NULL,
    `service_area` VARCHAR(255) NOT NULL,
    `verification_status` ENUM('VERIFIED', 'PENDING', 'REJECTED') NOT NULL DEFAULT 'VERIFIED',
    `contact_person` VARCHAR(100) NOT NULL,
    `capacity_people_fed` INTEGER NOT NULL DEFAULT 100,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ngos_user_id_key`(`user_id`),
    UNIQUE INDEX `ngos_registration_number_key`(`registration_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `beneficiary_groups` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ngo_id` INTEGER NOT NULL,
    `group_name` VARCHAR(150) NOT NULL,
    `location` VARCHAR(255) NOT NULL,
    `target_headcount` INTEGER NOT NULL,
    `vulnerability_type` ENUM('CHILDREN_ORPHANAGE', 'HOMELESS_SHELTER', 'ELDERLY_CARE', 'DISASTER_RELIEF', 'LOW_INCOME_COMMUNITY', 'MIGRANT_WORKERS') NOT NULL DEFAULT 'LOW_INCOME_COMMUNITY',
    `contact_representative` VARCHAR(100) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `beneficiary_groups_ngo_id_idx`(`ngo_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `food_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ngo_id` INTEGER NOT NULL,
    `beneficiary_group_id` INTEGER NULL,
    `requested_food_category` ENUM('COOKED_MEALS', 'RAW_INGREDIENTS', 'PACKAGED_FOOD', 'BAKERY', 'PRODUCE_FRUITS_VEG', 'BEVERAGES', 'DAIRY') NOT NULL,
    `required_quantity` DECIMAL(10, 2) NOT NULL,
    `fulfilled_quantity` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `unit` ENUM('KG', 'MEALS', 'PACKETS', 'LITERS', 'BOXES') NOT NULL DEFAULT 'MEALS',
    `urgency_level` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM',
    `status` ENUM('PENDING', 'PARTIALLY_FULFILLED', 'FULFILLED', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `needed_by` DATETIME(3) NOT NULL,
    `delivery_address` TEXT NOT NULL,
    `city` VARCHAR(100) NOT NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `food_requests_ngo_id_idx`(`ngo_id`),
    INDEX `food_requests_beneficiary_group_id_idx`(`beneficiary_group_id`),
    INDEX `food_requests_status_needed_by_idx`(`status`, `needed_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `request_allocations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `request_id` INTEGER NOT NULL,
    `listing_id` INTEGER NOT NULL,
    `allocated_quantity` DECIMAL(10, 2) NOT NULL,
    `allocation_status` ENUM('RESERVED', 'DISPATCHED', 'DELIVERED', 'CANCELLED') NOT NULL DEFAULT 'RESERVED',
    `allocated_by_user_id` INTEGER NULL,
    `allocated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `request_allocations_request_id_idx`(`request_id`),
    INDEX `request_allocations_listing_id_idx`(`listing_id`),
    INDEX `request_allocations_allocation_status_idx`(`allocation_status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `volunteers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `vehicle_type` ENUM('BIKE', 'CAR', 'VAN', 'REFRIGERATED_TRUCK', 'WALKING', 'AUTO_RICKSHAW') NOT NULL DEFAULT 'BIKE',
    `license_number` VARCHAR(100) NULL,
    `availability_status` ENUM('AVAILABLE', 'ON_DUTY', 'BUSY', 'INACTIVE') NOT NULL DEFAULT 'AVAILABLE',
    `operating_city` VARCHAR(100) NOT NULL,
    `max_cargo_capacity_kg` DECIMAL(8, 2) NULL,
    `deliveries_completed` INTEGER NOT NULL DEFAULT 0,
    `rating` DECIMAL(3, 2) NOT NULL DEFAULT 5.00,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `volunteers_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pickups` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `allocation_id` INTEGER NOT NULL,
    `listing_id` INTEGER NOT NULL,
    `volunteer_id` INTEGER NULL,
    `pickup_time_scheduled` DATETIME(3) NOT NULL,
    `actual_pickup_time` DATETIME(3) NULL,
    `pickup_status` ENUM('SCHEDULED', 'ASSIGNED', 'EN_ROUTE_TO_PICKUP', 'PICKED_UP', 'DELIVERED_TO_HUB', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
    `quantity_collected` DECIMAL(10, 2) NULL,
    `donor_signature_name` VARCHAR(100) NULL,
    `verification_otp` VARCHAR(10) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `pickups_allocation_id_idx`(`allocation_id`),
    INDEX `pickups_listing_id_idx`(`listing_id`),
    INDEX `pickups_volunteer_id_idx`(`volunteer_id`),
    INDEX `pickups_pickup_status_idx`(`pickup_status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `distributions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `allocation_id` INTEGER NOT NULL,
    `ngo_id` INTEGER NOT NULL,
    `beneficiary_group_id` INTEGER NULL,
    `distribution_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `distributed_quantity` DECIMAL(10, 2) NOT NULL,
    `beneficiaries_served_count` INTEGER NOT NULL DEFAULT 0,
    `distribution_status` ENUM('PREPARED', 'IN_TRANSIT', 'DISTRIBUTED', 'PARTIALLY_DISTRIBUTED', 'RETURNED_WASTE') NOT NULL DEFAULT 'DISTRIBUTED',
    `received_by_person` VARCHAR(100) NOT NULL,
    `verification_signature` VARCHAR(150) NULL,
    `feedback_notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `distributions_allocation_id_idx`(`allocation_id`),
    INDEX `distributions_ngo_id_idx`(`ngo_id`),
    INDEX `distributions_beneficiary_group_id_idx`(`beneficiary_group_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `food_donors` ADD CONSTRAINT `food_donors_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `food_listings` ADD CONSTRAINT `food_listings_donor_id_fkey` FOREIGN KEY (`donor_id`) REFERENCES `food_donors`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ngos` ADD CONSTRAINT `ngos_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `beneficiary_groups` ADD CONSTRAINT `beneficiary_groups_ngo_id_fkey` FOREIGN KEY (`ngo_id`) REFERENCES `ngos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `food_requests` ADD CONSTRAINT `food_requests_ngo_id_fkey` FOREIGN KEY (`ngo_id`) REFERENCES `ngos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `food_requests` ADD CONSTRAINT `food_requests_beneficiary_group_id_fkey` FOREIGN KEY (`beneficiary_group_id`) REFERENCES `beneficiary_groups`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_allocations` ADD CONSTRAINT `request_allocations_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `food_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_allocations` ADD CONSTRAINT `request_allocations_listing_id_fkey` FOREIGN KEY (`listing_id`) REFERENCES `food_listings`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_allocations` ADD CONSTRAINT `request_allocations_allocated_by_user_id_fkey` FOREIGN KEY (`allocated_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `volunteers` ADD CONSTRAINT `volunteers_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pickups` ADD CONSTRAINT `pickups_allocation_id_fkey` FOREIGN KEY (`allocation_id`) REFERENCES `request_allocations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pickups` ADD CONSTRAINT `pickups_listing_id_fkey` FOREIGN KEY (`listing_id`) REFERENCES `food_listings`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pickups` ADD CONSTRAINT `pickups_volunteer_id_fkey` FOREIGN KEY (`volunteer_id`) REFERENCES `volunteers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `distributions` ADD CONSTRAINT `distributions_allocation_id_fkey` FOREIGN KEY (`allocation_id`) REFERENCES `request_allocations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `distributions` ADD CONSTRAINT `distributions_ngo_id_fkey` FOREIGN KEY (`ngo_id`) REFERENCES `ngos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `distributions` ADD CONSTRAINT `distributions_beneficiary_group_id_fkey` FOREIGN KEY (`beneficiary_group_id`) REFERENCES `beneficiary_groups`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

