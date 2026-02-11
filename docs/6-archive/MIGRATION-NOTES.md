# Migration Notes - Entity Presentation Styles

## Summary of Changes

Updated the presentation styles system to use the new `entity_presentation_styles` table instead of the direct foreign key `categories.presentation_style_id`.

### Files Modified

1. **application/service/post-service.js** (2 queries updated)
   - `getAllPublishedPosts()` - Lines 215-219
   - `getSinglePost()` - Lines 279-283

2. **application/service/post-revision-service.js** (3 queries updated)
   - `getMostRecentDraftRevisionByPostId()` - Lines 79-84
   - `getRevisionsByPostId()` - Lines 132-137
   - `getRevisionById()` - Lines 186-191

### Files Created

1. **database/migration/018_migrate_category_presentation_styles.sql**
   - Migrates existing data from `categories.presentation_style_id` to `entity_presentation_styles`

2. **database/rollback/018_migrate_category_presentation_styles-down.sql**
   - Rollback script to revert the migration

3. **docs/entity-presentation-styles.md**
   - Complete documentation of the new system

## Query Changes

### Before (Old Query)
```javascript
.joinLeft('categories', 'posts.category_id = categories.id')
.joinLeft('presentation_styles', 'categories.presentation_style_id = presentation_styles.id')
```

### After (New Query)
```javascript
.joinLeft('categories', 'posts.category_id = categories.id')
.joinLeft('entity_presentation_styles',
  'entity_presentation_styles.entity_type = \'categories\' AND ' +
  'entity_presentation_styles.entity_id = categories.id AND ' +
  'entity_presentation_styles.is_default = 1')
.joinLeft('presentation_styles', 
  'entity_presentation_styles.style_id = presentation_styles.id')
```

## Running the Migration

### Step 1: Backup Your Database
```bash
# Create a backup before running migration
cp path/to/your/database.db path/to/your/database.db.backup
```

### Step 2: Run the Migration
```bash
# SQLite
sqlite3 path/to/your/database.db < database/migration/018_migrate_category_presentation_styles.sql

# Or if using the adapter
# Connect to your database and run the SQL manually
```

### Step 3: Verify the Migration
```sql
-- Check that data was migrated
SELECT 
    eps.*,
    c.name as category_name,
    ps.name as style_name
FROM entity_presentation_styles eps
JOIN categories c ON eps.entity_id = c.id
JOIN presentation_styles ps ON eps.style_id = ps.id
WHERE eps.entity_type = 'categories';
```

### Step 4: Test Your Application
```bash
# Start the dev server
npm run dev

# Visit your blog and verify:
# - Posts display correctly
# - Presentation styles are applied
# - No errors in console
```

### Step 5 (Optional): Drop Old Column

After verifying everything works, you can drop the old column:

```sql
-- WARNING: Only run this after thorough testing!
ALTER TABLE categories DROP COLUMN presentation_style_id;
```

## Rollback (If Needed)

If you encounter issues and need to rollback:

```bash
# Restore from backup
cp path/to/your/database.db.backup path/to/your/database.db

# Or run rollback script
sqlite3 path/to/your/database.db < database/rollback/018_migrate_category_presentation_styles-down.sql
```

## Testing Checklist

- [ ] Backup database created
- [ ] Migration script executed successfully
- [ ] Data verified in `entity_presentation_styles` table
- [ ] Application starts without errors
- [ ] Blog posts display correctly
- [ ] Presentation styles are applied to posts
- [ ] Admin panel works correctly
- [ ] No console errors
- [ ] Static build works (`npm run build`)

## Benefits of This Change

✅ **Flexible Architecture** - Any entity can now have presentation styles
✅ **Multiple Styles** - Entities can have multiple styles (one default)
✅ **Future-Proof** - Supports complex theming scenarios
✅ **Centralized** - All presentation styles managed in one table
✅ **Scalable** - Easy to add styles to new entity types

## Future Possibilities

With this architecture, you can now:

1. **Add presentation styles to posts directly**
   ```sql
   INSERT INTO entity_presentation_styles VALUES ('posts', 123, 2, true);
   ```

2. **Add presentation styles to topics**
   ```sql
   INSERT INTO entity_presentation_styles VALUES ('topics', 7, 1, true);
   ```

3. **Have multiple styles per entity**
   ```sql
   -- Default style
   INSERT INTO entity_presentation_styles VALUES ('categories', 5, 1, true);
   -- Alternative style
   INSERT INTO entity_presentation_styles VALUES ('categories', 5, 2, false);
   ```

## Documentation

See [docs/entity-presentation-styles.md](docs/entity-presentation-styles.md) for complete documentation.

---

**Migration Date:** December 2025
**Affected Services:** post-service, post-revision-service
**Database Changes:** New table usage, no schema changes
