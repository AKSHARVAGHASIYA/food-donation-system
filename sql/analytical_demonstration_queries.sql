-- ==============================================================================
-- FOOD DONATION AND DISTRIBUTION MANAGEMENT SYSTEM
-- Complex Academic Analytical Demonstration Queries
-- ==============================================================================

USE `food_donation_db`;

-- ------------------------------------------------------------------------------
-- QUERY 1: Multi-Table INNER & LEFT JOIN with Aggregate Functions, GROUP BY,
--          HAVING filter, and Multi-Column ORDER BY
-- Description: Analyzes donor contribution statistics, showing only donors who
--              have posted at least 1 listing and donated a cumulative quantity >= 20 units.
-- ------------------------------------------------------------------------------
SELECT 
    fd.id AS donor_id,
    u.full_name AS donor_name,
    fd.donor_type,
    fd.organization_name,
    COUNT(fl.id) AS total_listings,
    COALESCE(SUM(fl.quantity), 0) AS total_donated_qty,
    COALESCE(AVG(fl.quantity), 0) AS avg_listing_qty,
    COALESCE(MIN(fl.quantity), 0) AS min_batch_qty,
    COALESCE(MAX(fl.quantity), 0) AS max_batch_qty,
    COALESCE(SUM(fl.available_quantity), 0) AS current_unallocated_stock
FROM food_donors fd
INNER JOIN users u ON fd.user_id = u.id
LEFT JOIN food_listings fl ON fd.id = fl.donor_id
GROUP BY fd.id, u.full_name, fd.donor_type, fd.organization_name
HAVING total_listings > 0 AND total_donated_qty >= 20.00
ORDER BY total_donated_qty DESC, total_listings DESC;

-- ------------------------------------------------------------------------------
-- QUERY 2: Subquery with Aggregate Comparison (Correlated Subquery)
-- Description: Finds all food listings whose available quantity is strictly 
--              GREATER THAN the average available quantity for that same food category.
-- ------------------------------------------------------------------------------
SELECT 
    fl1.id AS listing_id,
    fl1.title,
    fl1.food_category,
    fl1.available_quantity,
    fl1.unit,
    fl1.city,
    fl1.expiry_date,
    (
        SELECT ROUND(AVG(fl2.available_quantity), 2)
        FROM food_listings fl2
        WHERE fl2.food_category = fl1.food_category
          AND fl2.status = 'AVAILABLE'
    ) AS category_avg_available
FROM food_listings fl1
WHERE fl1.status = 'AVAILABLE'
  AND fl1.available_quantity > (
      SELECT AVG(fl2.available_quantity)
      FROM food_listings fl2
      WHERE fl2.food_category = fl1.food_category
        AND fl2.status = 'AVAILABLE'
  )
ORDER BY fl1.food_category, fl1.available_quantity DESC;

-- ------------------------------------------------------------------------------
-- QUERY 3: Junction Table Allocation Traceability with 5-Table Join
-- Description: Detailed distribution journey from donor listing to NGO request,
--              pickup volunteer, and target beneficiary group.
-- ------------------------------------------------------------------------------
SELECT 
    ra.id AS allocation_id,
    ra.allocated_quantity,
    ra.allocation_status,
    fl.title AS food_title,
    fl.food_category,
    u_donor.full_name AS donor_name,
    n.ngo_name,
    COALESCE(bg.group_name, 'Direct Community Distribution') AS beneficiary_target,
    COALESCE(u_vol.full_name, 'Unassigned / Self-Pickup') AS assigned_volunteer,
    p.pickup_status,
    d.distribution_status,
    d.beneficiaries_served_count
FROM request_allocations ra
INNER JOIN food_listings fl ON ra.listing_id = fl.id
INNER JOIN food_donors fd ON fl.donor_id = fd.id
INNER JOIN users u_donor ON fd.user_id = u_donor.id
INNER JOIN food_requests fr ON ra.request_id = fr.id
INNER JOIN ngos n ON fr.ngo_id = n.id
LEFT JOIN beneficiary_groups bg ON fr.beneficiary_group_id = bg.id
LEFT JOIN pickups p ON ra.id = p.allocation_id
LEFT JOIN volunteers v ON p.volunteer_id = v.id
LEFT JOIN users u_vol ON v.user_id = u_vol.id
LEFT JOIN distributions d ON ra.id = d.allocation_id
ORDER BY ra.allocated_at DESC;

-- ------------------------------------------------------------------------------
-- QUERY 4: Smart Matching Algorithm Query
-- Description: Identifies active donor listings that match pending NGO requests
--              by food category, compatible city, and valid non-expired shelf life.
-- ------------------------------------------------------------------------------
SELECT 
    fr.id AS request_id,
    n.ngo_name,
    fr.requested_food_category,
    (fr.required_quantity - fr.fulfilled_quantity) AS needed_qty,
    fr.unit AS req_unit,
    fr.city AS req_city,
    fl.id AS candidate_listing_id,
    fl.title AS listing_title,
    fl.available_quantity AS listing_stock,
    fl.unit AS listing_unit,
    fl.city AS donor_city,
    TIMESTAMPDIFF(HOUR, NOW(), fl.expiry_date) AS hours_until_expiry,
    LEAST((fr.required_quantity - fr.fulfilled_quantity), fl.available_quantity) AS potential_match_qty
FROM food_requests fr
INNER JOIN ngos n ON fr.ngo_id = n.id
INNER JOIN food_listings fl ON (
    (fl.food_category = fr.requested_food_category)
    AND fl.status = 'AVAILABLE'
    AND fl.available_quantity > 0
    AND fl.expiry_date > NOW()
    AND (fl.city = fr.city OR fr.city IS NULL OR fl.city IS NULL)
)
WHERE fr.status IN ('PENDING', 'PARTIALLY_FULFILLED')
ORDER BY 
    CASE fr.urgency_level 
        WHEN 'CRITICAL' THEN 1 
        WHEN 'HIGH' THEN 2 
        WHEN 'MEDIUM' THEN 3 
        ELSE 4 
    END,
    fl.expiry_date ASC;
