# Analysis: Removal of post_revisions.presentation_style_id

## Summary
✅ **SAFE TO REMOVE** - Verification reveals **0 out of 57 revisions (0%)** have `post_revisions.presentation_style_id` set. The field exists in the schema and entity layer but has never been used in production.

**VERIFIED**: December 10, 2025
- **0 revisions** have `presentation_style_id` set (0% usage)
- **No production data** would be lost
- **Code references exist** but only copy unused data between posts and revisions
- **After removing posts.presentation_style_id from queries**, this field serves no purpose

**RECOMMENDATION**: ✅ **Safe to remove** - Follow the step-by-step removal process outlined below.

---

## Current State

### Database Schema
- **Table**: `post_revisions`
- **Field**: `presentation_style_id` (integer, nullable)
- **Foreign Key**: Likely `post_revisions_presentation_style_id_fkey` → `presentation_styles(id)`
- **Purpose**: Store presentation style in revision snapshots (mirrors posts.presentation_style_id)

### Data Status - VERIFIED
```sql
SELECT
  COUNT(*) FILTER (WHERE presentation_style_id IS NOT NULL) as revisions_with_style,
  COUNT(*) as total_revisions,
  array_agg(DISTINCT presentation_style_id) FILTER (WHERE presentation_style_id IS NOT NULL) as styles_used
FROM post_revisions;
```

**Results**:
- ✅ **Total revisions**: 57
- ✅ **Revisions with `presentation_style_id` set**: 0 (0%)
- ✅ **Style IDs in use**: null (none)

**FINDING**: The field has NEVER been populated in production.

---

## Code Analysis

### 1. PostRevisionEntity

**File**: `application/entity/post-revision-entity.js`

```javascript
// Field definition (line 59)
presentation_style_id: null, // Foreign key to presentation_styles

// Setter in exchangeData() (lines 136-138)
if (data.presentation_style_id !== undefined)
  this.storage.presentation_style_id = data.presentation_style_id;

// Included in toObject() (line 198)
presentation_style_id: this.storage.presentation_style_id,
```

**Usage**: Supports storing the field, but no production data uses it.

### 2. Admin Controllers

**revision-controller.js** (line 256):
```javascript
// When creating a new revision, copy from post
const revisionData = {
  // ... other fields ...
  category_id: post.category_id,
  presentation_style_id: post.presentation_style_id, // ← Copied from post
  disclosure_markdown: post.disclosure_markdown,
  // ...
};
```

**post-controller.js** (lines 1489, 1512):
```javascript
// When publishing, logs and uses draft revision data
console.log('[PostController] Draft revision found:', {
  id: draftRevision.id,
  presentation_style_id: draftRevision.presentation_style_id, // ← Logged
  // ...
});

// Later copied to post (line 1512)
presentation_style_id: draftRevision.presentation_style_id, // ← Copied to post
```

**Usage**: Code exists to copy the field between posts and revisions, but:
- Source (`posts.presentation_style_id`) is no longer selected in queries
- Destination (`post_revisions.presentation_style_id`) has never been populated
- The copying mechanism moves unused data in circles

### 3. PostRevisionService

**File**: `application/service/post-revision-service.js`

```javascript
/**
 * @param {number} revisionData.presentation_style_id - Presentation style ID
 */
async createRevision(revisionData) {
  // Method accepts the field but doesn't enforce it
}
```

**Usage**: Documentation mentions it, but it's optional and unused.

---

## Why It's Safe to Remove

### 1. No Data Loss
- **0 revisions** have the field set
- No production data would be affected
- No historical data to preserve

### 2. No Active Feature
- Field is not selected in PostRevisionService queries
- Views don't display it
- No admin UI for setting it
- Only copied between post ↔ revision, both of which ignore it

### 3. Posts Field Being Phased Out
Since `posts.presentation_style_id` was just removed from queries:
- New posts won't have this field populated in views
- New revisions won't have meaningful data to copy
- The revision field becomes even more orphaned

### 4. Simpler Than Posts Removal
Unlike `posts.presentation_style_id`:
- ❌ No production data to migrate (posts had 14 with data)
- ❌ No editorial intent to preserve (revisions have 0 with data)
- ✅ Purely a schema cleanup task

---

## Removal Process

Follow these steps in order:

### Step 1: Update PostRevisionEntity
**File**: `application/entity/post-revision-entity.js`

Remove these lines:
```javascript
// Line 59 - Remove field definition
presentation_style_id: null,

// Lines 136-138 - Remove setter
if (data.presentation_style_id !== undefined)
  this.storage.presentation_style_id = data.presentation_style_id;

// Line 198 - Remove from toObject()
presentation_style_id: this.storage.presentation_style_id,
```

### Step 2: Update Admin Controllers

**revision-controller.js** (line 256):
```javascript
// Remove this line when creating revisions
presentation_style_id: post.presentation_style_id, // ← DELETE THIS
```

**post-controller.js** (lines 1489, 1512):
```javascript
// Remove from logging (line 1489)
presentation_style_id: draftRevision.presentation_style_id, // ← DELETE THIS

// Remove from post update (line 1512)
presentation_style_id: draftRevision.presentation_style_id, // ← DELETE THIS
```

### Step 3: Update PostRevisionService Documentation

**File**: `application/service/post-revision-service.js` (line 244)
```javascript
// Remove this JSDoc parameter
* @param {number} revisionData.presentation_style_id - Presentation style ID
```

### Step 4: Database Migration

Create a migration to drop the column:

```sql
-- Drop foreign key constraint (if exists)
ALTER TABLE post_revisions
DROP CONSTRAINT IF EXISTS post_revisions_presentation_style_id_fkey;

-- Drop the column
ALTER TABLE post_revisions
DROP COLUMN presentation_style_id;
```

### Step 5: Update Schema Documentation

Update any schema files, ERD diagrams, or database documentation to reflect the removal.

---

## Risk Assessment

### Very Low Risk ✅

**Why it's safe**:
- Zero production data in the field
- No user-facing features depend on it
- Only internal copying between two unused fields
- Simpler than posts.presentation_style_id removal

**Potential issues**:
- 🔸 Code that explicitly reads `revision.presentation_style_id` will get `undefined`
  - **Mitigation**: The field was never populated, so existing code already handles this
- 🔸 Database migration needs to drop foreign key constraint
  - **Mitigation**: Standard migration process, no data to preserve

---

## Comparison with posts.presentation_style_id

| Aspect | posts.presentation_style_id | post_revisions.presentation_style_id |
|--------|----------------------------|-------------------------------------|
| **Rows with data** | 14 out of 30 (47%) | 0 out of 57 (0%) |
| **Data loss risk** | ⚠️ HIGH - 14 posts would lose styling | ✅ NONE - no data to lose |
| **Feature status** | 🔶 Used but broken (ignored by views) | ❌ Never used |
| **Code references** | Entity + Controllers + Services | Entity + Controllers + Services |
| **Removal complexity** | 🔶 Medium (must handle data) | ✅ Low (pure cleanup) |
| **Recommendation** | ⚠️ Requires careful decision | ✅ Safe to remove |

---

## Implementation Timeline

**Recommended approach**: Remove `post_revisions.presentation_style_id` first
1. Easier to remove (no data)
2. Reduces complexity before tackling posts field
3. Clean up the simpler case first

**If planning to keep posts.presentation_style_id**:
- Still safe to remove from revisions
- Revisions would just not track this field in history
- Posts would retain the field for future use

**If planning to remove posts.presentation_style_id later**:
- Remove from revisions first (now)
- Migrate posts.presentation_style_id data to NULL
- Then remove posts.presentation_style_id field
- Cleaner two-step process

---

## Testing After Removal

1. **Create a new revision**:
   ```
   - Edit a post in admin
   - Save as draft
   - Verify revision created without errors
   ```

2. **Publish a revision**:
   ```
   - Publish a draft revision
   - Verify post updates correctly
   - Check no errors in console
   ```

3. **View revision history**:
   ```
   - View revision list for a post
   - Verify all revisions display correctly
   ```

4. **Database verification**:
   ```sql
   -- Confirm column is gone
   SELECT column_name
   FROM information_schema.columns
   WHERE table_name = 'post_revisions'
     AND column_name = 'presentation_style_id';
   -- Should return 0 rows
   ```

---

## Verification Script

Created: `check-post-revisions-presentation-style-id.js`

Run to verify before removal:
```bash
node -e "
const path = require('path');
global.applicationPath = function(p) { return path.join(__dirname, p); };
const config = require('./application/config/application.config.js');
const PostgreSQLAdapter = require('./library/db/adapter/postgre-sql-adapter');

async function check() {
  const db = new PostgreSQLAdapter(config.database.connection);
  await db.connect();

  const result = await db.query(\`
    SELECT COUNT(*) FILTER (WHERE presentation_style_id IS NOT NULL) as count
    FROM post_revisions;
  \`);

  console.log('Revisions with presentation_style_id:', result[0].count);
  console.log(result[0].count === '0' ? '✅ Safe to remove' : '⚠️ Has data');

  await db.disconnect();
}
check();
"
```

---

**Last Updated**: December 10, 2025
**Status**: ✅ Verified safe to remove
**Next Step**: Follow removal process steps 1-5
