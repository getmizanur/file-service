-- Verification script for presentation styles data

-- Step 1: Check current data in categories table
SELECT
    id,
    name,
    presentation_style_id
FROM categories
ORDER BY id;

-- Step 2: Check if entity_presentation_styles has any data
SELECT COUNT(*) as entity_presentation_styles_count
FROM entity_presentation_styles
WHERE entity_type = 'categories';

-- Step 3: Check detailed entity_presentation_styles data
SELECT
    eps.entity_type,
    eps.entity_id,
    eps.style_id,
    eps.is_default,
    c.name as category_name,
    ps.name as style_name,
    ps.slug as style_slug
FROM entity_presentation_styles eps
LEFT JOIN categories c ON eps.entity_id = c.id
LEFT JOIN presentation_styles ps ON eps.style_id = ps.id
WHERE eps.entity_type = 'categories'
ORDER BY eps.entity_id;

-- Step 4: Verify the join works correctly (like the actual query)
SELECT
    c.id,
    c.name as category_name,
    eps.style_id,
    ps.name as presentation_style_name,
    ps.slug as presentation_style_slug,
    ps.css_classes as presentation_css_classes
FROM categories c
LEFT JOIN entity_presentation_styles eps
    ON eps.entity_type = 'categories'
    AND eps.entity_id = c.id
    AND eps.is_default = true
LEFT JOIN presentation_styles ps
    ON eps.style_id = ps.id
ORDER BY c.id;
