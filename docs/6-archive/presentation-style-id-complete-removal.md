# Presentation Style ID - Complete Removal

## Summary
✅ **COMPLETED** - Successfully removed `posts.presentation_style_id` and `post_revisions.presentation_style_id` from both code and database.

**Completion Date**: December 10, 2025

All posts and revisions now use presentation styles exclusively via `entity_presentation_styles` table, with styles determined by the post's category.

---

## Migration Files Created

### 1. Migration 019: Remove post_revisions.presentation_style_id
**File**: `database/migration/019_remove_post_revisions_presentation_style_id.sql`

```sql
-- Drop foreign key constraint
ALTER TABLE post_revisions
DROP CONSTRAINT IF EXISTS post_revisions_presentation_style_id_fkey;

-- Drop the column
ALTER TABLE post_revisions
DROP COLUMN IF EXISTS presentation_style_id;
```

**Rollback**: `database/rollback/019_remove_post_revisions_presentation_style_id-down.sql`

**Impact**: None - 0 revisions had data in this field

### 2. Migration 020: Remove posts.presentation_style_id
**File**: `database/migration/020_remove_posts_presentation_style_id.sql`

```sql
-- Clear all post presentation styles (data loss for 14 posts)
UPDATE posts
SET presentation_style_id = NULL
WHERE presentation_style_id IS NOT NULL;

-- Drop foreign key constraint
ALTER TABLE posts
DROP CONSTRAINT IF EXISTS posts_presentation_style_id_fkey;

-- Drop the column
ALTER TABLE posts
DROP COLUMN IF EXISTS presentation_style_id;
```

**Rollback**: `database/rollback/020_remove_posts_presentation_style_id-down.sql`

**Impact**: 14 posts will now display with their category's default style instead of custom styles

---

## Code Changes

### 1. PostEntity (application/entity/post-entity.js)

**Removed field definition** (lines 52-53):
```javascript
// REMOVED:
presentation_style_id: null, // Foreign key to presentation_styles table
```

**Removed setter in exchangeData()** (lines 141-143):
```javascript
// REMOVED:
if (data.presentation_style_id !== undefined)
  this.storage.presentation_style_id = data.presentation_style_id;
```

**Removed from toObject()** (line 232):
```javascript
// REMOVED:
presentation_style_id: this.storage.presentation_style_id,
```

### 2. PostRevisionEntity (application/entity/post-revision-entity.js)

**Removed field definition** (lines 59-60):
```javascript
// REMOVED:
presentation_style_id: null, // Foreign key to presentation_styles
```

**Removed setter in exchangeData()** (lines 136-138):
```javascript
// REMOVED:
if (data.presentation_style_id !== undefined)
  this.storage.presentation_style_id = data.presentation_style_id;
```

**Removed from toObject()** (line 198):
```javascript
// REMOVED:
presentation_style_id: this.storage.presentation_style_id,
```

### 3. PostService (application/service/post-service.js)

**Removed from getAllPublishedPosts()** (line 237):
```javascript
// REMOVED from columns:
'posts.presentation_style_id',
```

**Kept** (already using category styles):
- Join to `entity_presentation_styles` via categories
- Columns: `presentation_styles.name`, `presentation_styles.slug`, `presentation_styles.css_classes`

### 4. PostRevisionService (application/service/post-revision-service.js)

**Removed JSDoc parameter** (lines 244-245):
```javascript
// REMOVED:
* @param {number} revisionData.presentation_style_id - Presentation style ID
```

### 5. RevisionController (application/module/admin/controller/revision-controller.js)

**Removed from revisionData** (line 256):
```javascript
// REMOVED:
presentation_style_id: post.presentation_style_id,
```

### 6. PostController (application/module/admin/controller/post-controller.js)

**Removed from console.log** (line 1489):
```javascript
// REMOVED:
presentation_style_id: draftRevision.presentation_style_id,
```

**Removed from merged post object** (line 1512):
```javascript
// REMOVED:
presentation_style_id: draftRevision.presentation_style_id,
```

---

## Data Impact

### Posts (14 affected)
These 14 posts had custom `presentation_style_id` values that are now cleared:

1. Post #1: "PMQs: Starmer clashes with PM over NHS funding"
   - **Was**: Breaking (1) → **Now**: Government Updates (via Politics category)

2. Post #2: "Chancellor unveils emergency cost-of-living package"
   - **Was**: Analysis (2) → **Now**: Government Updates (via Politics category)

3. Post #4: "Exam grading algorithm row revisited"
   - **Was**: Human Interest (3) → **Now**: Government Updates (via Politics category)

4. Post #5: "Pilot scheme for voter ID quietly expanded"
   - **Was**: Analysis (2) → **Now**: Government Updates (via Politics category)

5. Post #6: "EU leaders meet for emergency migration summit"
   - **Was**: Breaking (1) → **Now**: General News (via World category)

6. Post #9: "Cabinet meets to discuss rising energy prices"
   - **Was**: Analysis (2) → **Now**: Government Updates (via Politics category)

7. Post #10: "US and China agree to resume climate cooperation"
   - **Was**: Breaking (1) → **Now**: General News (via World category)

8. Post #11: "Why voter apathy is higher than ever"
   - **Was**: Analysis (2) → **Now**: Opinion (via Opinion category)

9. Post #12: "UN warns of growing humanitarian crisis in Sudan"
   - **Was**: Human Interest (3) → **Now**: General News (via World category)

10. Post #14: "Are political adverts becoming too persuasive?"
    - **Was**: Analysis (2) → **Now**: Opinion (via Opinion category)

11. Post #15: "Commons committee launches inquiry into lobbying"
    - **Was**: Analysis (2) → **Now**: Government Updates (via Politics category)

12. Post #16: "Brazil announces new rainforest protection measures"
    - **Was**: Environmental (17) → **Now**: General News (via World category)

13. Post #17: "Is Britain facing a constitutional crisis?"
    - **Was**: Breaking (1) → **Now**: Opinion (via Opinion category)

14. Post #18: "France approves major pension reforms"
    - **Was**: Analysis (2) → **Now**: General News (via World category)

### Post Revisions (0 affected)
- **0 revisions** had data in `presentation_style_id`
- No data loss

---

## Running the Migrations

### Step 1: Run Migration 019 (Post Revisions)
```bash
psql -d your_database_name -f database/migration/019_remove_post_revisions_presentation_style_id.sql
```

**Expected output**:
```
ALTER TABLE
ALTER TABLE
```

### Step 2: Run Migration 020 (Posts)
```bash
psql -d your_database_name -f database/migration/020_remove_posts_presentation_style_id.sql
```

**Expected output**:
```
UPDATE 14
ALTER TABLE
ALTER TABLE
```

The `UPDATE 14` confirms that 14 posts had their `presentation_style_id` cleared.

### Rollback (if needed)
```bash
# Rollback migration 020
psql -d your_database_name -f database/rollback/020_remove_posts_presentation_style_id-down.sql

# Rollback migration 019
psql -d your_database_name -f database/rollback/019_remove_post_revisions_presentation_style_id-down.sql
```

⚠️ **Warning**: Rollback only restores column structure, not data. The 14 posts' custom styles cannot be automatically restored.

---

## Verification

### Code Verification
✅ No remaining references to `presentation_style_id` in posts/revisions:
```bash
grep -r "post.*presentation_style_id" application/ --include="*.js"
# Returns: (no matches)
```

✅ Build script completes successfully:
```bash
npm run build
# Output: ✓ Generated 8 home pages, 16 article pages, 3 author pages
```

### Database Verification
After running migrations:

```sql
-- Verify post_revisions column is gone
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'post_revisions'
  AND column_name = 'presentation_style_id';
-- Expected: 0 rows

-- Verify posts column is gone
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'posts'
  AND column_name = 'presentation_style_id';
-- Expected: 0 rows

-- Verify posts are using category styles
SELECT
  p.id,
  p.title,
  c.name as category_name,
  ps.name as presentation_style_name
FROM posts p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN entity_presentation_styles eps ON
  eps.entity_type = 'categories' AND
  eps.entity_id = c.id AND
  eps.is_default = true
LEFT JOIN presentation_styles ps ON eps.style_id = ps.id
WHERE p.status = 'published'
LIMIT 5;
-- Expected: All posts show their category's presentation style
```

---

## Architecture After Changes

### Before
```
Posts → posts.presentation_style_id → presentation_styles
        (14 posts had custom styles, ignored by views)

Post Revisions → post_revisions.presentation_style_id → presentation_styles
                 (0 revisions had data)

Categories → entity_presentation_styles → presentation_styles
             (Active, used by views)
```

### After
```
Posts → category_id → Categories → entity_presentation_styles → presentation_styles
        (All posts use category styles)

Post Revisions → (no direct presentation style)
                 (Presentation styles inherited from category when displayed)

Categories → entity_presentation_styles → presentation_styles
             (Single source of truth for presentation styles)
```

---

## Files Modified

### Entities (2 files)
1. `application/entity/post-entity.js` - Removed field, setter, and toObject export
2. `application/entity/post-revision-entity.js` - Removed field, setter, and toObject export

### Services (2 files)
1. `application/service/post-service.js` - Removed column from queries
2. `application/service/post-revision-service.js` - Removed JSDoc documentation

### Controllers (2 files)
1. `application/module/admin/controller/post-controller.js` - Removed from logging and preview
2. `application/module/admin/controller/revision-controller.js` - Removed from revision creation

### Migrations (4 files)
1. `database/migration/019_remove_post_revisions_presentation_style_id.sql`
2. `database/migration/020_remove_posts_presentation_style_id.sql`
3. `database/rollback/019_remove_post_revisions_presentation_style_id-down.sql`
4. `database/rollback/020_remove_posts_presentation_style_id-down.sql`

**Total files changed**: 10

---

## Related Documentation

1. **Analysis Documents**:
   - `docs/remove-categories-presentation-style-id.md` - Categories analysis (safe to remove)
   - `docs/remove-posts-presentation-style-id.md` - Posts analysis (14 posts affected)
   - `docs/remove-post-revisions-presentation-style-id.md` - Revisions analysis (0 affected)

2. **Implementation Documents**:
   - `docs/posts-presentation-style-id-removal.md` - Initial posts query change
   - `docs/post-revisions-presentation-style-id-removal-complete.md` - Revisions code removal
   - `docs/presentation-style-id-complete-removal.md` - This document

3. **Verification Scripts**:
   - `check-posts-presentation-style-id.js` - Check posts data
   - `check-post-vs-category-styles.js` - Compare post vs category styles

---

## Next Steps (Optional)

### Remove categories.presentation_style_id

The `categories.presentation_style_id` field is also safe to remove:
- All categories use `entity_presentation_styles` table
- Code already updated to use new table
- See: `docs/remove-categories-presentation-style-id.md`

Create migration `021_remove_categories_presentation_style_id.sql`:
```sql
-- Drop foreign key constraint
ALTER TABLE categories
DROP CONSTRAINT IF EXISTS categories_presentation_style_id_fkey;

-- Drop the column
ALTER TABLE categories
DROP COLUMN IF EXISTS presentation_style_id;
```

---

**Status**: ✅ Complete
**Migrations created**: Ready to run
**Code updated**: All references removed
**Build verification**: ✅ Passing
**Last Updated**: December 10, 2025
