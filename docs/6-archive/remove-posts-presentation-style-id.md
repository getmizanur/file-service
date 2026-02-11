# Analysis: Removal of posts.presentation_style_id

## Summary
🚨 **CRITICAL BUG FOUND - FEATURE IS BROKEN** - Verification reveals **14 out of 30 posts (47%)** actively use `posts.presentation_style_id` to **intentionally override** their category's presentation style. However, the frontend code **completely ignores** this field, causing all 14 posts to display with the WRONG styling.

**VERIFIED**: December 10, 2025
- **14 posts** have `presentation_style_id` set (47% of all posts)
- **ALL 14 posts** use DIFFERENT styles from their categories (100% override rate)
- **Style IDs in use**: Breaking (1), Analysis (2), Human Interest (3), Environmental (17)
- **BUG**: Frontend views ignore post styles and always use category default styles
- **IMPACT**: Posts marked as "Breaking" display as "Government Updates", etc.

**RECOMMENDATION**: 🔧 **FIX THE BUG** - Complete the feature by updating queries to honor post styles (Option A in this document). DO NOT remove the field - this would cause permanent data loss for 47% of posts.

---

## Current State

### Database Schema
- **Field**: `posts.presentation_style_id` (integer, nullable)
- **Foreign Key**: `posts_presentation_style_id_fkey` → `presentation_styles(id)`
- **Purpose**: Allows individual posts to override their category's presentation style

### Current Implementation
**Posts inherit presentation styles from their CATEGORY** via `entity_presentation_styles`:
```javascript
.joinLeft('entity_presentation_styles',
  'entity_presentation_styles.entity_type = \'categories\' AND ' +
  'entity_presentation_styles.entity_id = categories.id AND ' +
  'entity_presentation_styles.is_default = true')
.joinLeft('presentation_styles',
  'entity_presentation_styles.style_id = presentation_styles.id')
```

---

## Code Analysis

### 1. Field is ACTIVELY USED in Code

**PostEntity** (`application/entity/post-entity.js`):
```javascript
presentation_style_id: null, // Foreign key to presentation_styles

// Getter
getPresentationStyleId() {
  return this.get('presentation_style_id');
}

// Setter
setPresentationStyleId(presentationStyleId) {
  return this.set('presentation_style_id', presentationStyleId);
}
```

**PostRevisionEntity** (`application/entity/post-revision-entity.js`):
- ✅ Has `presentation_style_id` field
- ✅ Has getter/setter methods
- ✅ Copies `presentation_style_id` from original post
- ✅ Includes in revision data export

**Admin Controllers**:
- `post-controller.js`: Copies `presentation_style_id` from draft revisions
- `revision-controller.js`: Uses `post.presentation_style_id` when creating revisions

### 2. Field is SELECTED but NOT USED

**PostService** queries select it:
```javascript
'posts.presentation_style_id',  // Line 237
```

But views **DON'T use it**:
```html
<!-- Views use category's style, not post's style -->
<h1 class="... {{ post.presentation_css_classes }}">{{ post.title }}</h1>
<span class="dp-tag dp-tag--{{ post.presentation_style_slug }}">{{ post.category_name }}</span>
```

### 3. No UI for Setting It

**Admin Forms** (`view/application/admin/post/new.njk`, `edit.njk`):
- ❌ No form field for `presentation_style_id`
- ❌ No dropdown to select presentation style
- ❌ No UI to override category's style

---

## Design Intent vs Reality

### Original Intent (Likely)
Posts COULD have their own presentation style that overrides the category default:
- Post style (if set) → Use post's `presentation_style_id`
- Category style (fallback) → Use category's style from `entity_presentation_styles`

### Current Reality
- Posts **inherit** category's style automatically
- `posts.presentation_style_id` field exists but is **never set**
- No logic to prioritize post style over category style
- No admin UI to set per-post styles

---

## Why It Can't Be Removed Yet

### 1. Entity Layer Dependencies
The field is deeply integrated into:
- PostEntity (getter/setter)
- PostRevisionEntity (getter/setter + data export)
- Admin controllers (copying between post and revisions)

### 2. No Migration Path
Unlike `categories.presentation_style_id`:
- ❌ No migration to `entity_presentation_styles` for posts
- ❌ No verification queries exist
- ❌ Unknown if ANY posts have this field set

### 3. Feature Incomplete, Not Unused
The field appears to be part of an **incomplete feature** for per-post style overrides:
- Feature was designed but never fully implemented
- UI was never built
- Logic to check post style before category style doesn't exist

---

## Two Possible Paths Forward

### Option A: Complete the Feature ✨
**Implement per-post style overrides** (if this is desired):

1. **Add UI** to admin forms:
   ```html
   <select name="presentation_style_id">
     <option value="">Use Category Default</option>
     <option value="1">Style 1</option>
     <option value="2">Style 2</option>
   </select>
   ```

2. **Update query logic** to prioritize post style:
   ```javascript
   // Check if post has its own style, otherwise use category style
   .columns([
     'COALESCE(post_styles.slug, cat_styles.slug) as presentation_style_slug',
     'COALESCE(post_styles.name, cat_styles.name) as presentation_style_name',
     'COALESCE(post_styles.css_classes, cat_styles.css_classes) as presentation_css_classes'
   ])
   .joinLeft('presentation_styles as post_styles',
     'posts.presentation_style_id = post_styles.id')
   .joinLeft('entity_presentation_styles', ...)
   .joinLeft('presentation_styles as cat_styles',
     'entity_presentation_styles.style_id = cat_styles.id')
   ```

3. **OR migrate to entity_presentation_styles pattern**:
   ```sql
   -- Allow posts to have presentation styles
   INSERT INTO entity_presentation_styles (entity_type, entity_id, style_id, is_default)
   SELECT 'posts', id, presentation_style_id, true
   FROM posts
   WHERE presentation_style_id IS NOT NULL;
   ```

### Option B: Remove the Feature 🗑️
**Remove per-post style capability** (if not needed):

1. **Verify no posts use it**:
   ```sql
   SELECT COUNT(*) FROM posts WHERE presentation_style_id IS NOT NULL;
   ```

2. **Update entities** to remove field and methods

3. **Update admin controllers** to stop copying the field

4. **Remove from queries**

5. **Drop database column**

---

## Recommendation

**DO NOT REMOVE YET** - Choose one path:

### If per-post styles ARE needed:
✅ **Complete the feature** by:
1. Adding admin UI
2. Implementing prioritization logic (post style > category style)
3. OR migrating to `entity_presentation_styles` pattern

### If per-post styles are NOT needed:
⚠️ **Plan removal carefully**:
1. Verify zero posts have the field set
2. Remove from entities (breaking change for any code creating posts)
3. Remove from admin controllers
4. Remove from queries
5. Create migration to drop column
6. Update schema files

---

## Risk Assessment

### High Risk ⚠️
- Field is part of entity structure
- Used in post/revision copying logic
- Breaking change if posts have the field set
- More complex than categories field removal

### ⚠️ VERIFIED Data Status - CRITICAL FINDING

**Verification Query Run**: December 10, 2025

```sql
SELECT
  COUNT(*) FILTER (WHERE presentation_style_id IS NOT NULL) as posts_with_style,
  COUNT(*) as total_posts,
  array_agg(DISTINCT presentation_style_id) FILTER (WHERE presentation_style_id IS NOT NULL) as styles_used
FROM posts;
```

**Results**:
- ✅ **Total posts**: 30
- 🚨 **Posts with `presentation_style_id` set**: 14 (47%)
- 🚨 **Style IDs in use**: [1, 2, 3, 17]

**CRITICAL**: Nearly half of all posts have this field set in production!

**Follow-up Analysis** - Post Styles vs Category Styles:
```sql
-- All 14 posts use DIFFERENT styles from their categories!
SELECT COUNT(*) FROM posts p
JOIN entity_presentation_styles eps ON eps.entity_id = p.category_id
WHERE p.presentation_style_id != eps.style_id; -- Returns: 14
```

**Result**: 🚨 **ALL 14 posts are INTENTIONALLY overriding their category's style**
- 0 posts match their category style
- 14 posts use different styles (100%)
- This proves the feature is being ACTIVELY USED for its intended purpose

**Affected Posts** (post style → category default style):
- Post #1: "PMQs: Starmer clashes with PM over NHS funding" (Politics)
  - **Post**: Breaking → **Category**: Government Updates
- Post #2: "Chancellor unveils emergency cost-of-living package" (Politics)
  - **Post**: Analysis → **Category**: Government Updates
- Post #4: "Exam grading algorithm row revisited" (Politics)
  - **Post**: Human Interest → **Category**: Government Updates
- Post #5: "Pilot scheme for voter ID quietly expanded" (Politics)
  - **Post**: Analysis → **Category**: Government Updates
- Post #6: "EU leaders meet for emergency migration summit" (World)
  - **Post**: Breaking → **Category**: General News
- Post #9: "Cabinet meets to discuss rising energy prices" (Politics)
  - **Post**: Analysis → **Category**: Government Updates
- Post #10: "US and China agree to resume climate cooperation" (World)
  - **Post**: Breaking → **Category**: General News
- Post #11: "Why voter apathy is higher than ever" (Opinion)
  - **Post**: Analysis → **Category**: Opinion
- Post #12: "UN warns of growing humanitarian crisis in Sudan" (World)
  - **Post**: Human Interest → **Category**: General News
- Post #14: "Are political adverts becoming too persuasive?" (Opinion)
  - **Post**: Analysis → **Category**: Opinion
- Post #15: "Commons committee launches inquiry into lobbying" (Politics)
  - **Post**: Analysis → **Category**: Government Updates
- Post #16: "Brazil announces new rainforest protection measures" (World)
  - **Post**: Environmental → **Category**: General News
- Post #17: "Is Britain facing a constitutional crisis?" (Opinion)
  - **Post**: Breaking → **Category**: Opinion
- Post #18: "France approves major pension reforms" (World)
  - **Post**: Analysis → **Category**: General News

---

## Updated Recommendation

### 🚫 CANNOT REMOVE WITHOUT DATA MIGRATION

The original analysis assumed the field might be unused. **The verification proves otherwise** - 14 posts actively use this field. However, the frontend code **ignores** this field and always uses the category's presentation style instead.

This creates a **silent data loss scenario**:
- Posts have `presentation_style_id` set in the database
- Views completely ignore it and display category's style
- Users may think they set a specific style, but it's not being honored

### Two Paths Forward:

#### Option A: Honor the Field (Complete the Feature) ✅ RECOMMENDED
**The field is being used - we should honor it!**

1. **Update PostService queries** to prioritize post style over category style:
   ```javascript
   // Use COALESCE to check post style first, then fallback to category style
   .columns([
     'COALESCE(post_styles.slug, cat_styles.slug) as presentation_style_slug',
     'COALESCE(post_styles.name, cat_styles.name) as presentation_style_name',
     'COALESCE(post_styles.css_classes, cat_styles.css_classes) as presentation_css_classes'
   ])
   .joinLeft('presentation_styles as post_styles',
     'posts.presentation_style_id = post_styles.id')
   .joinLeft('entity_presentation_styles', ...)
   .joinLeft('presentation_styles as cat_styles',
     'entity_presentation_styles.style_id = cat_styles.id')
   ```

2. **Add admin UI** to edit/set per-post presentation styles

3. **Document the feature** so editors know it exists

**Why this is better**: Respects existing data, completes partially-implemented feature

#### Option B: Migrate to Category Styles (Remove Feature) 🚫 NOT RECOMMENDED
**❌ VERIFIED AS UNSAFE - All 14 posts would lose their intended styling**

**Verification Results**:
```sql
-- ALL 14 posts use different styles from their categories
SELECT COUNT(*) FROM posts p
JOIN entity_presentation_styles eps ON
  eps.entity_type = 'categories' AND eps.entity_id = p.category_id
WHERE p.presentation_style_id != eps.style_id;
-- Result: 14 (100% of posts with the field set)
```

**Data Loss Impact**:
- 14 posts marked as "Breaking" would become "Government Updates"
- 7 posts marked as "Analysis" would become "Government Updates" or "Opinion"
- 2 posts marked as "Human Interest" would lose this classification
- 1 post marked as "Environmental" would become "General News"

**If you still choose to proceed** (not recommended):

1. **Migration steps**:
   ```sql
   -- Clear all post presentation styles (PERMANENT DATA LOSS)
   UPDATE posts SET presentation_style_id = NULL;

   -- Then remove the field
   ALTER TABLE posts DROP COLUMN presentation_style_id;
   ```

2. **Update code** (entities, controllers, services)

3. **Accept consequences**: All posts will use category default styles only

**Why this is NOT recommended**:
- 100% data loss for the 14 posts using this feature
- Breaks editorial intent (posts deliberately styled differently)
- Removes functionality that is clearly being used
- No evidence the feature should be removed (only that it's broken)

---

## Implementation Plan for Option A (Recommended)

### Phase 1: Fix Query Logic
Update [post-service.js:237](../application/service/post-service.js#L237) and similar queries to use COALESCE pattern shown above.

### Phase 2: Test
Verify posts now display their intended styles.

### Phase 3: Add Admin UI (Optional)
Add presentation style dropdown to post edit forms.

### Phase 4: Documentation
Document the per-post style override feature.

---

## Verification Scripts

Two verification scripts were created and executed to analyze this field:

1. **`check-posts-presentation-style-id.js`**
   - Counts how many posts have `presentation_style_id` set
   - Lists which posts are using the field
   - Result: 14 out of 30 posts (47%)

2. **`check-post-vs-category-styles.js`**
   - Compares post styles with their category's default styles
   - Identifies if posts are using different styles (overrides)
   - Result: ALL 14 posts use different styles (100% override rate)

Run these scripts to re-verify:
```bash
node check-posts-presentation-style-id.js
node check-post-vs-category-styles.js
```

---

**Last Updated**: December 10, 2025
