# Quick Reference Guide

Fast lookup for common admin tasks.

---

## Admin URLs

| Page | URL |
|------|-----|
| Login | `/admin` |
| Dashboard | `/admin/posts` |
| New Post | `/admin/posts/new` |
| Edit Post | `/admin/posts/{id}/edit` |
| Preview Post | `/admin/posts/{id}/preview` |
| New Revision | `/admin/posts/{post_id}/revisions/new` |
| Edit Revision | `/admin/posts/{post_id}/revisions/{id}/edit` |
| Logout | `/admin/logout` |

---

## Post Workflow Cheat Sheet

### Creating New Content

```
Dashboard → New Post → Fill form → Save Draft / Preview / Publish
```

### Updating Published Post

```
Dashboard → Edit → Create revision draft → Make changes → Publish
```

### Deleting Content

**Draft (never published):**
```
Edit draft → Scroll to bottom → Delete draft → Confirm
```

**Published/Unpublished post:**
```
Edit post → Scroll to bottom → Enter reason → Delete article → Confirm
```

---

## Post States

| State | Indicator | Can Edit Directly? | On Blog? |
|-------|-----------|-------------------|----------|
| Draft | 🟡 Yellow | ✅ Yes | ❌ No |
| Published | 🟢 Green | ❌ No (use revision) | ✅ Yes |
| Unpublished | 🔵 Blue | ❌ No (use revision) | ❌ No |

---

## Button Actions

### On New/Edit Page

| Button | Action |
|--------|--------|
| **Save Draft** | Saves without publishing |
| **Preview** | Shows how post will look (doesn't save) |
| **Publish** | Makes post live immediately |
| **Unpublish** | Removes from blog (published posts only) |
| **Create a revision draft** | Start editing published post |
| **Delete draft** | Permanently delete unpublished draft |
| **Delete article** | Soft-delete published post (requires reason) |

---

## Markdown Quick Guide

```markdown
# H1 Heading
## H2 Heading
### H3 Heading

**Bold** and *italic*

[Link text](https://example.com)

![Image](url.jpg)

- Bullet list
- Another item

1. Numbered list
2. Another item

> Blockquote

`inline code`

[youtube:VIDEO_ID]
```

---

## Field Reference

### Required Fields

- ✅ **Title**: Post headline
- ✅ **Content**: Article body (Markdown)

### Optional Fields

- **Summary**: Brief description (recommended for SEO)
- **Author**: Defaults to current user
- **Source**: External source credit
- **Source URL**: Link to source
- **Source Notes**: Internal notes (not published)
- **Disclosure**: Transparency note (e.g., sponsored)
- **Featured Image**: Upload image file

---

## Common Scenarios

### Scenario: Typo in Published Post

1. Go to post edit page
2. Click "Create a revision draft"
3. Fix typo
4. Click "Publish"

### Scenario: Need to Update Multiple Things

1. Create revision draft
2. Make all changes
3. Click "Save Draft" periodically
4. Preview when done
5. Publish when ready

### Scenario: Want to Schedule Content

1. Create new post
2. Write all content
3. Click "Save Draft"
4. When ready to publish, edit and click "Publish"

### Scenario: Need to Remove Post Temporarily

1. Go to post edit page
2. Click "Unpublish"
3. Post is hidden from blog
4. Can re-publish via revision later

### Scenario: Wrong Post Created

**If never published:**
- Edit page → Delete draft

**If published:**
- Edit page → Enter reason → Delete article

---

## Validation Rules

| Field | Requirement |
|-------|-------------|
| Title | Required, must not be empty |
| Content | Required, must not be empty |
| Delete Reason | Required when deleting published posts |
| All other fields | Optional |

---

## Status Messages

### Success Messages (Green)

- ✅ "Article published successfully"
- ✅ "Draft saved successfully"
- ✅ "Revision published successfully"
- ✅ "Draft deleted successfully"

### Info Messages (Blue)

- ℹ️ "This article has an unpublished draft revision"
- ℹ️ "Draft has been deleted successfully"

### Error Messages (Red)

- ❌ "Title is required"
- ❌ "Content is required"
- ❌ "Delete reason is required"
- ❌ Form validation errors

### Warning Messages (Yellow)

- ⚠️ "You're editing a draft revision"
- ⚠️ "This post has not been published yet"

---

## Do's and Don'ts

### ✅ DO

- Save drafts frequently
- Preview before publishing
- Use revisions for published posts
- Provide deletion reasons
- Fill in summaries
- Use Markdown formatting

### ❌ DON'T

- Edit published posts directly
- Publish without previewing
- Delete without reason
- Leave title/content empty
- Create multiple revisions for same post

---

## Troubleshooting Quick Fixes

| Problem | Solution |
|---------|----------|
| Can't edit published post | Create revision draft instead |
| Preview shows old content | Save draft first, then preview |
| Post not on blog | Run build script & deploy |
| Lost unsaved changes | Use browser back button immediately |
| "Draft revision exists" warning | Edit or delete existing revision |

---

## Build & Deploy Commands

```bash
# Build static site
npm run build

# Deploy to S3
npm run deploy

# Build and deploy
npm run deploy:full

# Preview static site locally
npm run serve-static
```

---

## Support Resources

- Full guide: [docs/admin-user-guide.md](./admin-user-guide.md)
- Security: [SECURITY.md](../SECURITY.md)
- Logging: [LOGGING.md](../LOGGING.md)
- Deployment: [DEPLOYMENT.md](../DEPLOYMENT.md)

---

## Sponsorship and Feature Slotting

### Sponsorship
- **Sponsors Table**: Stores sponsor details (brand identity, links, default disclosure text).
- **Post Sponsorships**: Links posts to sponsors with sponsorship type, position, and schedule window.

### Feature Slotting
- **Post Features Table**: Manages feature slots for posts across different site areas.
  - Fields include `feature_area`, `featured_priority`, `featured_from`, and `featured_to`.
  - Uniqueness constraints ensure a post appears only once per `feature_area`.
  - `(feature_area, featured_priority)` combinations are unique when priority is set.

---

**Print this page for desk reference!**
