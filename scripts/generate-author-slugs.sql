-- Generate slugs for authors who don't have them
-- Run this script to ensure all authors have unique slugs for their profile pages

-- Step 1: Check which authors are missing slugs
SELECT
    id,
    name,
    email,
    slug,
    CASE WHEN slug IS NULL THEN '❌ Missing' ELSE '✅ Has slug' END as slug_status
FROM users
ORDER BY id;

-- Step 2: Generate basic slugs from names
UPDATE users
SET slug = LOWER(
    REPLACE(
        REPLACE(
            REPLACE(
                REPLACE(name, ' ', '-'),
            '.', ''),
        '''', ''),
    '"', '')
)
WHERE slug IS NULL OR slug = '';

-- Step 3: Remove any remaining special characters
UPDATE users
SET slug = REGEXP_REPLACE(slug, '[^a-z0-9-]', '', 'g')
WHERE slug IS NOT NULL;

-- Step 4: Remove multiple consecutive hyphens
UPDATE users
SET slug = REGEXP_REPLACE(slug, '-+', '-', 'g')
WHERE slug IS NOT NULL;

-- Step 5: Remove leading/trailing hyphens
UPDATE users
SET slug = TRIM(BOTH '-' FROM slug)
WHERE slug IS NOT NULL;

-- Step 6: Handle duplicates by appending user ID
WITH duplicate_slugs AS (
    SELECT slug
    FROM users
    WHERE slug IS NOT NULL
    GROUP BY slug
    HAVING COUNT(*) > 1
)
UPDATE users
SET slug = slug || '-' || id
WHERE slug IN (SELECT slug FROM duplicate_slugs)
AND id NOT IN (
    -- Keep the first occurrence without ID suffix
    SELECT MIN(id)
    FROM users
    WHERE slug IN (SELECT slug FROM duplicate_slugs)
    GROUP BY slug
);

-- Step 7: Verify results
SELECT
    id,
    name,
    slug,
    (SELECT COUNT(*) FROM posts WHERE author_id = users.id AND status = 'published') as published_posts
FROM users
ORDER BY id;

-- Step 8: Check for any remaining issues
SELECT
    CASE
        WHEN slug IS NULL THEN 'Missing slug'
        WHEN slug = '' THEN 'Empty slug'
        WHEN slug ~ '[^a-z0-9-]' THEN 'Invalid characters in slug'
        ELSE 'OK'
    END as issue,
    COUNT(*) as count
FROM users
GROUP BY issue;

-- Step 9: Verify slug uniqueness
SELECT
    slug,
    COUNT(*) as count
FROM users
WHERE slug IS NOT NULL
GROUP BY slug
HAVING COUNT(*) > 1;

-- If the above returns any rows, there are still duplicate slugs that need manual fixing
