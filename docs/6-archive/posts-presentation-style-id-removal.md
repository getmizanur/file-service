# Posts Presentation Style ID - Removal Implementation

## Summary
Updated the application to stop using `posts.presentation_style_id` field and instead always use the category's presentation style via `entity_presentation_styles`.

**Date**: December 10, 2025

---

## Changes Made

### 1. PostService (application/service/post-service.js)

**Method**: `getAllPublishedPosts()`
- **Removed**: Explicit selection of `'posts.presentation_style_id'` from columns list (line 237)
- **Kept**: Join to `entity_presentation_styles` and `presentation_styles` via categories
- **Result**: Posts now always display with their category's default presentation style

### 2. Other Services

**PostRevisionService** (application/service/post-revision-service.js)
- ✅ Already uses only category presentation styles via `entity_presentation_styles`
- No changes needed

**UserService** (application/service/user-service.js)
- ✅ Does not reference presentation styles
- No changes needed

### 3. Build Script (scripts/build-script.js)

- ✅ Uses PostService for fetching posts
- No direct queries with presentation_style_id
- Will automatically use updated PostService behavior

### 4. Views

- ✅ No view templates reference `presentation_style_id` directly
- Views only use `post.presentation_style_slug`, `post.presentation_style_name`, etc.
- These fields now come exclusively from category's style via `entity_presentation_styles`

---

## Data Impact

**Before the change**:
- 14 posts had custom `presentation_style_id` values
- All 14 were using DIFFERENT styles from their categories
- Frontend was already ignoring these values (bug)

**After the change**:
- All posts now use their category's default presentation style
- The 14 posts that had custom styles will now display with category styles
- Data in `posts.presentation_style_id` column still exists but is no longer selected/used

**Affected posts** (now showing category style instead of custom style):
1. Post #1: "PMQs: Starmer clashes with PM over NHS funding"
   - Was: Breaking → Now: Government Updates

2. Post #2: "Chancellor unveils emergency cost-of-living package"
   - Was: Analysis → Now: Government Updates

3. Post #4: "Exam grading algorithm row revisited"
   - Was: Human Interest → Now: Government Updates

4. Post #5: "Pilot scheme for voter ID quietly expanded"
   - Was: Analysis → Now: Government Updates

5. Post #6: "EU leaders meet for emergency migration summit"
   - Was: Breaking → Now: General News

6. Post #9: "Cabinet meets to discuss rising energy prices"
   - Was: Analysis → Now: Government Updates

7. Post #10: "US and China agree to resume climate cooperation"
   - Was: Breaking → Now: General News

8. Post #11: "Why voter apathy is higher than ever"
   - Was: Analysis → Now: Opinion

9. Post #12: "UN warns of growing humanitarian crisis in Sudan"
   - Was: Human Interest → Now: General News

10. Post #14: "Are political adverts becoming too persuasive?"
    - Was: Analysis → Now: Opinion

11. Post #15: "Commons committee launches inquiry into lobbying"
    - Was: Analysis → Now: Government Updates

12. Post #16: "Brazil announces new rainforest protection measures"
    - Was: Environmental → Now: General News

13. Post #17: "Is Britain facing a constitutional crisis?"
    - Was: Breaking → Now: Opinion

14. Post #18: "France approves major pension reforms"
    - Was: Analysis → Now: General News

---

## Technical Details

### Query Pattern (CORRECT - Now Used)

```javascript
select.from('posts')
  .joinLeft('categories', 'posts.category_id = categories.id')
  .joinLeft('entity_presentation_styles',
    'entity_presentation_styles.entity_type = \'categories\' AND ' +
    'entity_presentation_styles.entity_id = categories.id AND ' +
    'entity_presentation_styles.is_default = true')
  .joinLeft('presentation_styles',
    'entity_presentation_styles.style_id = presentation_styles.id')
  .columns([
    // ... other columns ...
    'presentation_styles.name as presentation_style_name',
    'presentation_styles.slug as presentation_style_slug',
    'presentation_styles.css_classes as presentation_css_classes'
  ]);
```

**How it works**:
1. Joins to `categories` table via `posts.category_id`
2. Joins to `entity_presentation_styles` where:
   - `entity_type = 'categories'` (looking for category styles)
   - `entity_id = categories.id` (for this specific category)
   - `is_default = true` (the default style for this category)
3. Joins to `presentation_styles` to get the style details
4. Selects style name, slug, and CSS classes for use in views

---

## Next Steps (Optional)

### If you want to fully remove the field:

1. **Verify application works correctly** with the changes
2. **Update database schema**:
   ```sql
   -- Optional: Clear all values first
   UPDATE posts SET presentation_style_id = NULL;

   -- Drop the foreign key constraint
   ALTER TABLE posts DROP CONSTRAINT posts_presentation_style_id_fkey;

   -- Drop the column
   ALTER TABLE posts DROP COLUMN presentation_style_id;
   ```

3. **Update Entity classes**:
   - Remove `presentation_style_id` field from PostEntity
   - Remove getter/setter methods from PostEntity
   - Remove `presentation_style_id` from PostRevisionEntity
   - Remove getter/setter methods from PostRevisionEntity

4. **Update Admin Controllers**:
   - Remove references to `presentation_style_id` in post-controller.js
   - Remove references to `presentation_style_id` in revision-controller.js

5. **Update schema documentation**:
   - Update any schema files or ERD diagrams

---

## Testing

To verify the changes work correctly:

1. **Start the application**:
   ```bash
   npm start
   ```

2. **View posts on the frontend**:
   - Posts should display with their category's presentation style
   - Check that the 14 previously affected posts now show category styles

3. **Run the build script**:
   ```bash
   npm run build
   ```
   - Static site should generate correctly
   - All post pages should display with category styles

4. **Check specific posts** (examples):
   - Post #1 should now show "Government Updates" style (not "Breaking")
   - Post #16 should now show "General News" style (not "Environmental")

---

**Implementation Date**: December 10, 2025
**Updated By**: Claude Code
