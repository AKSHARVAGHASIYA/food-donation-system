-- ==============================================================================
-- FOOD DONATION AND DISTRIBUTION MANAGEMENT SYSTEM
-- Advanced DBMS Concepts: Views, Stored Procedures, Functions, and Triggers
-- Database: MySQL 8.0+ / utf8mb4
-- ==============================================================================

USE `food_donation_db`;

-- ------------------------------------------------------------------------------
-- 1. DATABASE VIEWS (Virtual Tables for Abstraction & Reporting)
-- ------------------------------------------------------------------------------

-- View 1: Pending & Partial Request Fulfillments with NGO & Beneficiary Details
DROP VIEW IF EXISTS `v_pending_fulfillments`;
CREATE VIEW `v_pending_fulfillments` AS
SELECT 
    fr.id AS request_id,
    n.ngo_name,
    n.contact_person AS ngo_contact,
    u.phone AS ngo_phone,
    u.email AS ngo_email,
    bg.group_name AS beneficiary_group,
    bg.vulnerability_type,
    bg.target_headcount,
    fr.requested_food_category,
    fr.required_quantity,
    fr.fulfilled_quantity,
    (fr.required_quantity - fr.fulfilled_quantity) AS remaining_quantity_needed,
    fr.unit,
    fr.urgency_level,
    fr.status AS request_status,
    fr.needed_by,
    fr.city,
    fr.delivery_address
FROM food_requests fr
INNER JOIN ngos n ON fr.ngo_id = n.id
INNER JOIN users u ON n.user_id = u.id
LEFT JOIN beneficiary_groups bg ON fr.beneficiary_group_id = bg.id
WHERE fr.status IN ('PENDING', 'PARTIALLY_FULFILLED')
ORDER BY 
    CASE fr.urgency_level 
        WHEN 'CRITICAL' THEN 1 
        WHEN 'HIGH' THEN 2 
        WHEN 'MEDIUM' THEN 3 
        ELSE 4 
    END,
    fr.needed_by ASC;

-- View 2: Donor Contribution & Activity Analytics Summary
DROP VIEW IF EXISTS `v_donor_contribution_summary`;
CREATE VIEW `v_donor_contribution_summary` AS
SELECT 
    fd.id AS donor_id,
    u.full_name AS donor_name,
    u.email AS donor_email,
    fd.donor_type,
    fd.organization_name,
    COUNT(fl.id) AS total_listings_count,
    COALESCE(SUM(fl.quantity), 0) AS total_quantity_donated,
    COALESCE(SUM(fl.available_quantity), 0) AS total_available_stock,
    COALESCE(SUM(fl.quantity - fl.available_quantity), 0) AS total_quantity_distributed,
    COUNT(CASE WHEN fl.status = 'AVAILABLE' THEN 1 END) AS active_available_listings,
    COUNT(CASE WHEN fl.status = 'FULLY_ALLOCATED' THEN 1 END) AS fully_allocated_listings,
    COUNT(CASE WHEN fl.status = 'EXPIRED' THEN 1 END) AS expired_listings,
    MAX(fl.created_at) AS latest_donation_date
FROM food_donors fd
INNER JOIN users u ON fd.user_id = u.id
LEFT JOIN food_listings fl ON fd.id = fl.donor_id
GROUP BY fd.id, u.full_name, u.email, fd.donor_type, fd.organization_name;

-- View 3: NGO Fulfillment Rate & Demand Metrics
DROP VIEW IF EXISTS `v_ngo_request_status`;
CREATE VIEW `v_ngo_request_status` AS
SELECT 
    n.id AS ngo_id,
    n.ngo_name,
    n.registration_number,
    n.service_area,
    COUNT(fr.id) AS total_requests_count,
    COALESCE(SUM(fr.required_quantity), 0) AS total_quantity_requested,
    COALESCE(SUM(fr.fulfilled_quantity), 0) AS total_quantity_fulfilled,
    ROUND(
        CASE 
            WHEN SUM(fr.required_quantity) > 0 
            THEN (SUM(fr.fulfilled_quantity) / SUM(fr.required_quantity)) * 100 
            ELSE 0 
        END, 2
    ) AS fulfillment_percentage,
    COUNT(CASE WHEN fr.status = 'FULFILLED' THEN 1 END) AS fully_satisfied_requests,
    COUNT(CASE WHEN fr.status = 'PARTIALLY_FULFILLED' THEN 1 END) AS partially_satisfied_requests,
    COUNT(CASE WHEN fr.status = 'PENDING' THEN 1 END) AS pending_requests
FROM ngos n
LEFT JOIN food_requests fr ON n.id = fr.ngo_id
GROUP BY n.id, n.ngo_name, n.registration_number, n.service_area;

-- View 4: Volunteer Logistics Load & Performance
DROP VIEW IF EXISTS `v_volunteer_logistics_load`;
CREATE VIEW `v_volunteer_logistics_load` AS
SELECT 
    v.id AS volunteer_id,
    u.full_name AS volunteer_name,
    u.phone AS volunteer_phone,
    v.vehicle_type,
    v.availability_status,
    v.operating_city,
    v.deliveries_completed,
    v.rating,
    COUNT(p.id) AS total_assigned_pickups,
    COUNT(CASE WHEN p.pickup_status IN ('ASSIGNED', 'EN_ROUTE_TO_PICKUP') THEN 1 END) AS active_pending_pickups,
    COUNT(CASE WHEN p.pickup_status = 'DELIVERED_TO_HUB' THEN 1 END) AS successful_pickups
FROM volunteers v
INNER JOIN users u ON v.user_id = u.id
LEFT JOIN pickups p ON v.id = p.volunteer_id
GROUP BY v.id, u.full_name, u.phone, v.vehicle_type, v.availability_status, v.operating_city, v.deliveries_completed, v.rating;

-- ------------------------------------------------------------------------------
-- 2. STORED FUNCTIONS (Scalar Computations)
-- ------------------------------------------------------------------------------

DROP FUNCTION IF EXISTS `fn_calculate_listing_remaining_qty`;
DELIMITER $$
CREATE FUNCTION `fn_calculate_listing_remaining_qty`(p_listing_id INT)
RETURNS DECIMAL(10, 2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_remaining DECIMAL(10, 2);
    SELECT available_quantity INTO v_remaining
    FROM food_listings
    WHERE id = p_listing_id;
    
    RETURN COALESCE(v_remaining, 0.00);
END$$
DELIMITER ;

DROP FUNCTION IF EXISTS `fn_ngo_fulfillment_rate`;
DELIMITER $$
CREATE FUNCTION `fn_ngo_fulfillment_rate`(p_ngo_id INT)
RETURNS DECIMAL(5, 2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_rate DECIMAL(5, 2);
    SELECT 
        ROUND(
            CASE 
                WHEN SUM(required_quantity) > 0 
                THEN (SUM(fulfilled_quantity) / SUM(required_quantity)) * 100 
                ELSE 0 
            END, 2
        ) INTO v_rate
    FROM food_requests
    WHERE ngo_id = p_ngo_id;
    
    RETURN COALESCE(v_rate, 0.00);
END$$
DELIMITER ;

-- ------------------------------------------------------------------------------
-- 3. STORED PROCEDURE WITH ACID TRANSACTION & ROW LOCKING
-- ------------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_allocate_food_stock`;
DELIMITER $$
CREATE PROCEDURE `sp_allocate_food_stock`(
    IN p_request_id INT,
    IN p_listing_id INT,
    IN p_alloc_qty DECIMAL(10, 2),
    IN p_admin_id INT,
    OUT p_allocation_id INT,
    OUT p_result_code VARCHAR(50),
    OUT p_result_message VARCHAR(255)
)
proc_block: BEGIN
    DECLARE v_listing_avail DECIMAL(10, 2);
    DECLARE v_listing_expiry DATETIME(3);
    DECLARE v_listing_status VARCHAR(50);
    DECLARE v_req_required DECIMAL(10, 2);
    DECLARE v_req_fulfilled DECIMAL(10, 2);
    DECLARE v_req_remaining DECIMAL(10, 2);
    DECLARE v_req_status VARCHAR(50);

    -- Standard error handler for transactional rollback
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_allocation_id = NULL;
        SET p_result_code = 'TRANSACTION_ERROR';
        SET p_result_message = 'An unexpected SQL exception occurred during allocation. Transaction rolled back.';
    END;

    -- Basic input validation
    IF p_alloc_qty <= 0 THEN
        SET p_allocation_id = NULL;
        SET p_result_code = 'INVALID_QUANTITY';
        SET p_result_message = 'Allocated quantity must be strictly greater than 0.';
        LEAVE proc_block;
    END IF;

    -- BEGIN ACID TRANSACTION
    START TRANSACTION;

    -- 1. Lock and inspect Food Listing record
    SELECT available_quantity, expiry_date, status 
    INTO v_listing_avail, v_listing_expiry, v_listing_status
    FROM food_listings
    WHERE id = p_listing_id
    FOR UPDATE;

    IF v_listing_avail IS NULL THEN
        ROLLBACK;
        SET p_allocation_id = NULL;
        SET p_result_code = 'LISTING_NOT_FOUND';
        SET p_result_message = 'The specified food listing was not found.';
        LEAVE proc_block;
    END IF;

    -- Check expiry
    IF v_listing_expiry < NOW(3) THEN
        ROLLBACK;
        SET p_allocation_id = NULL;
        SET p_result_code = 'LISTING_EXPIRED';
        SET p_result_message = 'Cannot allocate from an expired food listing.';
        LEAVE proc_block;
    END IF;

    -- Check inventory availability
    IF v_listing_avail < p_alloc_qty THEN
        ROLLBACK;
        SET p_allocation_id = NULL;
        SET p_result_code = 'INSUFFICIENT_STOCK';
        SET p_result_message = CONCAT('Listing has only ', v_listing_avail, ' available, but ', p_alloc_qty, ' was requested.');
        LEAVE proc_block;
    END IF;

    -- 2. Lock and inspect Food Request record
    SELECT required_quantity, fulfilled_quantity, status
    INTO v_req_required, v_req_fulfilled, v_req_status
    FROM food_requests
    WHERE id = p_request_id
    FOR UPDATE;

    IF v_req_required IS NULL THEN
        ROLLBACK;
        SET p_allocation_id = NULL;
        SET p_result_code = 'REQUEST_NOT_FOUND';
        SET p_result_message = 'The specified food request was not found.';
        LEAVE proc_block;
    END IF;

    SET v_req_remaining = v_req_required - v_req_fulfilled;

    IF v_req_remaining < p_alloc_qty THEN
        ROLLBACK;
        SET p_allocation_id = NULL;
        SET p_result_code = 'EXCEEDS_REQUEST_DEMAND';
        SET p_result_message = CONCAT('Request needs only ', v_req_remaining, ' units, but allocation of ', p_alloc_qty, ' attempted.');
        LEAVE proc_block;
    END IF;

    -- 3. Insert into Junction Table: request_allocations
    INSERT INTO request_allocations (
        request_id,
        listing_id,
        allocated_quantity,
        allocation_status,
        allocated_by_user_id,
        allocated_at,
        updated_at
    ) VALUES (
        p_request_id,
        p_listing_id,
        p_alloc_qty,
        'RESERVED',
        p_admin_id,
        NOW(3),
        NOW(3)
    );

    SET p_allocation_id = LAST_INSERT_ID();

    -- 4. Deduct available quantity from listing and update status
    UPDATE food_listings
    SET 
        available_quantity = available_quantity - p_alloc_qty,
        status = CASE 
            WHEN (available_quantity - p_alloc_qty) <= 0 THEN 'FULLY_ALLOCATED'
            ELSE 'PARTIALLY_ALLOCATED'
        END,
        updated_at = NOW(3)
    WHERE id = p_listing_id;

    -- 5. Update fulfilled quantity on food request and update status
    UPDATE food_requests
    SET 
        fulfilled_quantity = fulfilled_quantity + p_alloc_qty,
        status = CASE 
            WHEN (fulfilled_quantity + p_alloc_qty) >= required_quantity THEN 'FULFILLED'
            ELSE 'PARTIALLY_FULFILLED'
        END,
        updated_at = NOW(3)
    WHERE id = p_request_id;

    -- 6. Automatically generate a pending Pickup task for volunteer logistics
    INSERT INTO pickups (
        allocation_id,
        listing_id,
        pickup_time_scheduled,
        pickup_status,
        quantity_collected,
        verification_otp,
        created_at,
        updated_at
    ) VALUES (
        p_allocation_id,
        p_listing_id,
        DATE_ADD(NOW(3), INTERVAL 2 HOUR),
        'SCHEDULED',
        p_alloc_qty,
        LPAD(FLOOR(RAND() * 999999), 6, '0'),
        NOW(3),
        NOW(3)
    );

    -- COMMIT TRANSACTION
    COMMIT;

    SET p_result_code = 'SUCCESS';
    SET p_result_message = CONCAT('Stock allocation #', p_allocation_id, ' created successfully and pickup scheduled.');

END proc_block$$
DELIMITER ;

-- ------------------------------------------------------------------------------
-- 4. TRIGGERS (Automated Business Rule & Integrity Enforcement)
-- ------------------------------------------------------------------------------

-- Trigger 1: Prevent negative available inventory on food_listings
DROP TRIGGER IF EXISTS `trg_prevent_negative_inventory`;
DELIMITER $$
CREATE TRIGGER `trg_prevent_negative_inventory`
BEFORE UPDATE ON `food_listings`
FOR EACH ROW
BEGIN
    IF NEW.available_quantity < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Integrity Violation: Food listing available_quantity cannot fall below 0.';
    END IF;
END$$
DELIMITER ;

-- Trigger 2: Prevent allocation creation if the listing has already expired
DROP TRIGGER IF EXISTS `trg_prevent_expired_allocation`;
DELIMITER $$
CREATE TRIGGER `trg_prevent_expired_allocation`
BEFORE INSERT ON `request_allocations`
FOR EACH ROW
BEGIN
    DECLARE v_expiry DATETIME(3);
    SELECT expiry_date INTO v_expiry
    FROM food_listings
    WHERE id = NEW.listing_id;

    IF v_expiry IS NOT NULL AND v_expiry < NOW(3) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Integrity Violation: Cannot create an allocation from an expired food listing.';
    END IF;
END$$
DELIMITER ;

-- Trigger 3: Automatically increment volunteer delivery counter when pickup is completed
DROP TRIGGER IF EXISTS `trg_update_volunteer_deliveries_count`;
DELIMITER $$
CREATE TRIGGER `trg_update_volunteer_deliveries_count`
AFTER UPDATE ON `pickups`
FOR EACH ROW
BEGIN
    IF NEW.pickup_status = 'DELIVERED_TO_HUB' AND (OLD.pickup_status != 'DELIVERED_TO_HUB' OR OLD.pickup_status IS NULL) THEN
        IF NEW.volunteer_id IS NOT NULL THEN
            UPDATE volunteers
            SET 
                deliveries_completed = deliveries_completed + 1,
                availability_status = 'AVAILABLE',
                updated_at = NOW(3)
            WHERE id = NEW.volunteer_id;
        END IF;
    END IF;
END$$
DELIMITER ;
