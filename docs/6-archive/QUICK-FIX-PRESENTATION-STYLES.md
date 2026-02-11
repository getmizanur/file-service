# Quick Fix: Presentation Styles Not Showing

## Problem
Header and tag colors are not showing on preview pages because the `entity_presentation_styles` table is empty.

## Solution
Run the migration to transfer data from `categories.presentation_style_id` to `entity_presentation_styles`.

---

## Step 1: Verify the Issue

Run this query to check if `entity_presentation_styles` is empty:

```bash
# PostgreSQL
psql -U your_username -d your_database_name -f scripts/verify-presentation-styles.sql

# Or connect to your database and run:
SELECT COUNT(*) FROM entity_presentation_styles WHERE entity_type = 'categories';
```

If the count is **0**, you need to run the migration.

---

## Step 2: Run the Migration

### Option A: Using psql (PostgreSQL)

```bash
psql -U your_username -d your_database_name -f database/migration/018_migrate_category_presentation_styles.sql
```

### Option B: Using your database client

Connect to your database and run:

```sql
-- Insert existing category presentation styles into entity_presentation_styles
INSERT INTO entity_presentation_styles (entity_type, entity_id, style_id, is_default)
SELECT
    'categories' as entity_type,
    id as entity_id,
    presentation_style_id as style_id,
    true as is_default
FROM categories
WHERE presentation_style_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM entity_presentation_styles
    WHERE entity_type = 'categories'
    AND entity_id = categories.id
    AND is_default = true
);
```

### Option C: Using Node.js script

Create a quick migration script:

```javascript
// scripts/run-migration.js
const { Client } = require('pg');
require('dotenv').config();

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();

    const result = await client.query(`
      INSERT INTO entity_presentation_styles (entity_type, entity_id, style_id, is_default)
      SELECT
          'categories' as entity_type,
          id as entity_id,
          presentation_style_id as style_id,
          true as is_default
      FROM categories
      WHERE presentation_style_id IS NOT NULL
      AND NOT EXISTS (
          SELECT 1 FROM entity_presentation_styles
          WHERE entity_type = 'categories'
          AND entity_id = categories.id
          AND is_default = true
      )
    `);

    console.log('✅ Migration complete!');
    console.log(`   Rows inserted: ${result.rowCount}`);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await client.end();
  }
}

runMigration();
```

Run it:
```bash
node scripts/run-migration.js
```

---

## Step 3: Verify the Fix

After running the migration, verify the data:

```sql
-- Check the data was migrated
SELECT
    c.name as category_name,
    ps.name as style_name,
    ps.slug as style_slug,
    ps.css_classes
FROM entity_presentation_styles eps
JOIN categories c ON eps.entity_id = c.id
JOIN presentation_styles ps ON eps.style_id = ps.id
WHERE eps.entity_type = 'categories';
```

You should see rows like:
```
category_name | style_name | style_slug | css_classes
--------------+------------+------------+----------------------------------
Politics      | Analysis   | analysis   | post-header header header--analysis
```

---

## Step 4: Test the Preview

1. Restart your dev server:
   ```bash
   npm run dev
   ```

2. Visit a preview page:
   ```
   http://localhost:8080/admin/posts/27/preview
   ```

3. Check the browser console for debug logs:
   ```javascript
   [PostController] Draft revision found: {...}
   [PostController] Merged post object: {
     presentation_css_classes: 'post-header header header--analysis',
     presentation_style_slug: 'analysis'
   }
   ```

4. Verify the header has the correct CSS classes and tag colors show

---

## Expected Results

After the migration:

✅ **Header** should have classes like: `post-header header header--analysis`
✅ **Tag** should have class like: `dp-tag dp-tag--analysis`
✅ **Colors** should display based on the presentation style

---

## Troubleshooting

### Issue: Migration says "0 rows inserted"

**Cause:** Either migration already ran, or categories don't have presentation_style_id set.

**Check:**
```sql
SELECT id, name, presentation_style_id FROM categories;
```

If `presentation_style_id` is NULL for all categories, you need to assign presentation styles first:

```sql
-- Example: Assign style #1 to category #1
UPDATE categories SET presentation_style_id = 1 WHERE id = 1;

-- Then run migration again
```

### Issue: Still showing "post-header header red" (fallback)

**Cause:** The LEFT JOIN is not finding matching data.

**Debug:**
```sql
-- Check if the join works
SELECT
    c.id,
    c.name,
    eps.style_id,
    ps.css_classes
FROM categories c
LEFT JOIN entity_presentation_styles eps
    ON eps.entity_type = 'categories'
    AND eps.entity_id = c.id
    AND eps.is_default = true
LEFT JOIN presentation_styles ps ON eps.style_id = ps.id
WHERE c.id = 1;  -- Replace with your category ID
```

If `style_id` and `css_classes` are NULL, the migration didn't run correctly.

### Issue: Console shows NULL for presentation fields

**Cause:** Post is not assigned to a category, or category has no presentation style.

**Check:**
```sql
-- Verify post has a category
SELECT id, title, category_id FROM posts WHERE id = 27;  -- Your post ID

-- Verify category has a style in entity_presentation_styles
SELECT * FROM entity_presentation_styles
WHERE entity_type = 'categories' AND entity_id = 1;  -- Category ID from above
```

---

## Quick Reference

**Verify table is populated:**
```sql
SELECT COUNT(*) FROM entity_presentation_styles WHERE entity_type = 'categories';
```

**Check specific post's presentation style:**
```sql
SELECT
    p.id,
    p.title,
    c.name as category,
    ps.name as style,
    ps.css_classes
FROM posts p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN entity_presentation_styles eps
    ON eps.entity_type = 'categories'
    AND eps.entity_id = c.id
    AND eps.is_default = true
LEFT JOIN presentation_styles ps ON eps.style_id = ps.id
WHERE p.id = 27;  -- Your post ID
```

---

**Need help?** See [MIGRATION-NOTES.md](MIGRATION-NOTES.md) for detailed migration guide.
