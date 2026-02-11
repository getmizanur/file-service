# Entity Presentation Styles

This document explains the entity presentation styles system and how it provides flexible theming for different content types.

---

## Overview

The `entity_presentation_styles` table provides a flexible, entity-agnostic way to assign presentation styles (themes) to any content type in the system.

### Before (Direct Foreign Key)

Previously, presentation styles were assigned directly:

```sql
-- categories table had a direct foreign key
categories.presentation_style_id → presentation_styles.id
```

**Limitations:**
- Only categories could have presentation styles
- Each entity type needed its own foreign key column
- Less flexible for complex theming scenarios

### After (Entity-Agnostic)

Now, any entity can have presentation styles through the `entity_presentation_styles` junction table:

```sql
-- Any entity can have presentation styles
entity_presentation_styles {
    entity_type: 'categories',
    entity_id: 5,
    style_id: 2,
    is_default: true
}
```

**Benefits:**
- ✅ Any entity type can have presentation styles
- ✅ Entities can have multiple styles (one default)
- ✅ Centralized style management
- ✅ Supports future complex theming scenarios

---

## Table Structure

### `entity_presentation_styles`

| Column | Type | Description |
|--------|------|-------------|
| `entity_type` | TEXT | Table name (e.g., 'categories', 'posts', 'topics') |
| `entity_id` | INTEGER | Primary key of the entity |
| `style_id` | INTEGER | Foreign key to `presentation_styles.id` |
| `is_default` | BOOLEAN | Whether this is the default style for this entity |

**Primary Key:** `(entity_type, entity_id, is_default)`

**Constraint:** Only one default style per entity (enforced by primary key)

---

## Usage Examples

### Assigning a Style to a Category

```sql
INSERT INTO entity_presentation_styles (entity_type, entity_id, style_id, is_default)
VALUES ('categories', 5, 2, true);
```

This assigns presentation style #2 (e.g., "Analysis") to category #5 as the default style.

### Querying Posts with Category Presentation Styles

```sql
SELECT
    posts.*,
    categories.name as category_name,
    presentation_styles.name as presentation_style_name,
    presentation_styles.css_classes
FROM posts
LEFT JOIN categories ON posts.category_id = categories.id
LEFT JOIN entity_presentation_styles
    ON entity_presentation_styles.entity_type = 'categories'
    AND entity_presentation_styles.entity_id = categories.id
    AND entity_presentation_styles.is_default = 1
LEFT JOIN presentation_styles
    ON entity_presentation_styles.style_id = presentation_styles.id
WHERE posts.status = 'published';
```

This query fetches posts with their category's default presentation style.

---

## Code Implementation

### Post Service Query

The `post-service.js` queries have been updated to use the new table:

```javascript
select.from('posts')
  .joinLeft('categories', 'posts.category_id = categories.id')
  .joinLeft('entity_presentation_styles',
    'entity_presentation_styles.entity_type = \'categories\' AND ' +
    'entity_presentation_styles.entity_id = categories.id AND ' +
    'entity_presentation_styles.is_default = 1')
  .joinLeft('presentation_styles',
    'entity_presentation_styles.style_id = presentation_styles.id')
  .columns([
    'posts.*',
    'presentation_styles.name as presentation_style_name',
    'presentation_styles.css_classes as presentation_css_classes'
  ]);
```

### Post Revision Service Query

Similarly, `post-revision-service.js` queries use the same pattern:

```javascript
select.from('post_revisions')
  .joinLeft('categories', 'post_revisions.category_id = categories.id')
  .joinLeft('entity_presentation_styles',
    'entity_presentation_styles.entity_type = \'categories\' AND ' +
    'entity_presentation_styles.entity_id = categories.id AND ' +
    'entity_presentation_styles.is_default = 1')
  .joinLeft('presentation_styles',
    'entity_presentation_styles.style_id = presentation_styles.id')
```

---

## Migration

### Running the Migration

To migrate existing data from `categories.presentation_style_id` to `entity_presentation_styles`:

```bash
# Apply migration
sqlite3 path/to/database.db < database/migration/018_migrate_category_presentation_styles.sql
```

### What the Migration Does

1. Copies all `categories.presentation_style_id` values to `entity_presentation_styles`
2. Sets `entity_type = 'categories'`
3. Sets `is_default = true` for all migrated styles
4. Prevents duplicates if run multiple times

### Rolling Back

If you need to revert:

```bash
# Rollback migration
sqlite3 path/to/database.db < database/rollback/018_migrate_category_presentation_styles-down.sql
```

This will:
1. Copy data back from `entity_presentation_styles` to `categories.presentation_style_id`
2. Delete category entries from `entity_presentation_styles`

---

## Future Enhancements

This architecture supports advanced theming scenarios:

### Multiple Styles Per Entity

```sql
-- Category can have multiple styles
INSERT INTO entity_presentation_styles VALUES
    ('categories', 5, 1, true),   -- Default: Breaking News
    ('categories', 5, 2, false);  -- Alternative: Analysis
```

### Styles for Posts Directly

```sql
-- Assign presentation style directly to a post (overrides category)
INSERT INTO entity_presentation_styles VALUES
    ('posts', 123, 3, true);  -- Post #123 uses "Feature" style
```

### Topic-Based Styles

```sql
-- If you add a topics table in the future
INSERT INTO entity_presentation_styles VALUES
    ('topics', 7, 1, true);  -- Topic #7 uses "Breaking News" style
```

---

## Presentation Styles Reference

### Available Styles

From `sample_presentation_styles.sql`:

| ID | Slug | Name | Description |
|----|------|------|-------------|
| 1 | `breaking-news` | Breaking News | High-priority breaking stories |
| 2 | `analysis` | In-depth Analysis | Long-form explainers and analysis |
| 3 | `feature` | Feature Story | Human-interest and magazine-style pieces |

### CSS Classes

Each style includes CSS classes for theming:

```
post-header header header--{slug}
```

Examples:
- `post-header header header--breaking-news`
- `post-header header header--analysis`
- `post-header header header--feature`

---

## Best Practices

### When Assigning Styles

1. **Always set `is_default = true`** for the primary style
2. **Use consistent `entity_type` names** (should match table names)
3. **Ensure `entity_id` exists** in the referenced table before assignment
4. **Only one default per entity** (enforced by primary key constraint)

### When Querying

1. **Always filter by `entity_type`** to avoid cross-entity confusion
2. **Always filter by `is_default = 1`** to get the primary style
3. **Use LEFT JOIN** to handle entities without styles gracefully
4. **Include presentation style columns** in SELECT for rendering

---

## Troubleshooting

### Issue: Posts not showing presentation styles

**Check:**
1. Category has an entry in `entity_presentation_styles`
2. The `is_default` flag is set to `true` (or `1`)
3. The `style_id` references a valid `presentation_styles.id`
4. The query includes the proper JOINs

**Query to verify:**
```sql
SELECT
    c.id,
    c.name,
    eps.style_id,
    ps.name as style_name
FROM categories c
LEFT JOIN entity_presentation_styles eps
    ON eps.entity_type = 'categories'
    AND eps.entity_id = c.id
    AND eps.is_default = 1
LEFT JOIN presentation_styles ps ON eps.style_id = ps.id;
```

### Issue: Migration fails with "UNIQUE constraint failed"

**Solution:** The migration has already been run. Check:

```sql
SELECT * FROM entity_presentation_styles WHERE entity_type = 'categories';
```

If data exists, the migration has already been applied.

---

## Related Files

- **Migration:** `database/migration/018_migrate_category_presentation_styles.sql`
- **Rollback:** `database/rollback/018_migrate_category_presentation_styles-down.sql`
- **Schema:** `database/migration/017_entity_presenation_styles.sql`
- **Seeds:** `database/seeds/sample_presentation_styles.sql`
- **Service:** `application/service/post-service.js`
- **Service:** `application/service/post-revision-service.js`

---

**Last Updated:** December 2025
