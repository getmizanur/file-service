# Admin User Guide

Complete guide for using the DailyPolitics CMS admin panel.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Creating a New Post](#creating-a-new-post)
4. [Editing Posts](#editing-posts)
5. [Working with Revisions](#working-with-revisions)
6. [Publishing & Unpublishing](#publishing--unpublishing)
7. [Preview Posts](#preview-posts)
8. [Deleting Content](#deleting-content)
9. [Understanding Post States](#understanding-post-states)
10. [Markdown Guide](#markdown-guide)
11. [Best Practices](#best-practices)
12. [Sponsorship and Feature Slotting](#sponsorship-and-feature-slotting)

---

## Getting Started

### Logging In

1. Navigate to the admin panel: `http://your-site.com/admin`
2. Enter your username and password
3. Click **"Sign in"**

After successful login, you'll be redirected to the **Posts Dashboard**.

### Logging Out

Click **"Logout"** in the sidebar at any time to end your session.

---

## Dashboard Overview

The dashboard (`/admin/posts`) displays all your posts and drafts in a table format.

### Dashboard Columns

| Column | Description |
|--------|-------------|
| **Title** | The post headline |
| **Author** | Who created the post |
| **Date** | Publication or creation date |
| **Status** | Current state (Published, Draft, Unpublished) |
| **Actions** | Edit, Preview, or Delete buttons |

### Dashboard Features

- **Pagination**: Navigate through posts using page numbers at the bottom
- **Flash Messages**: Success, error, or info messages appear at the top
- **New Post Button**: Create a new post from the dashboard
- **Sidebar Navigation**: Quick access to all sections

---

## Creating a New Post

### Step-by-Step

1. **Navigate to New Post**
   - Click **"New Post"** button on the dashboard
   - Or go to `/admin/posts/new`

2. **Fill in Post Details**

   **Required Fields:**
   - **Title**: Your post headline (e.g., "Breaking: New Policy Announced")
   - **Summary**: Brief description (shown in listings)
   - **Content**: Main article body (supports Markdown)

   **Optional Fields:**
   - **Author**: Default is current user, can be changed
   - **Source**: External source credit
   - **Source URL**: Link to original source
   - **Source Notes**: Internal notes about the source (not published)
   - **Disclosure**: Transparency note (e.g., "Sponsored content")

3. **Add Featured Image** (Optional)
   - Upload an image file
   - Recommended: JPG or PNG format
   - Images are automatically optimized

4. **Choose Action**

   You have three options:

   **Option 1: Save as Draft**
   - Click **"Save Draft"**
   - Saves your work without publishing
   - You can continue editing later
   - Status: "Draft" (never published)

   **Option 2: Preview**
   - Click **"Preview"**
   - See how your post will look when published
   - Returns to edit page after preview
   - Does NOT save changes

   **Option 3: Publish**
   - Click **"Publish"**
   - Makes the post live on your website immediately
   - Status: "Published"
   - A unique slug is automatically generated

### After Publishing

- You'll see a success message: "Article published successfully"
- The post appears on your blog immediately
- A unique URL is created (e.g., `/articles/abc123def456/index.html`)

### Post Slug

The slug is a unique identifier for your post:
- Auto-generated using CUID2 (e.g., `w7mz3d1e4kvu`)
- Permanent once published
- Cannot be changed after publication

---

## Editing Posts

### How to Edit a Post

1. **Navigate to the post**
   - From dashboard, click **"Edit"** next to any post
   - Or go to `/admin/posts/{id}/edit`

2. **Understanding the Edit Page**

   You'll see different options depending on the post's state:

   **For Published Posts:**
   - 🟢 Green inset: "You're viewing a published post..."
   - Message: Any changes must be made in a revision draft
   - Button: **"Create a revision draft"**

   **For Unpublished Posts:**
   - 🔵 Blue inset: "You're viewing an unpublished post..."
   - Can edit directly
   - Button: **"Delete this article"** (requires reason)

   **For Drafts (never published):**
   - 🟡 Yellow inset: "You're editing a draft..."
   - Can edit and publish directly
   - Button: **"Delete this draft"** (no reason required)

### Editing Published Posts

**IMPORTANT**: You cannot edit published posts directly.

To update a published post:

1. Click **"Create a revision draft"** on the edit page
2. You'll be redirected to create a new revision
3. Make your changes in the revision
4. Publish the revision to update the live post

This workflow ensures:
- Published content remains stable
- Changes are reviewed before going live
- Edit history is preserved

### Editing Drafts

For posts that have never been published:

1. Make your changes to any field
2. Click **"Save Draft"** to save without publishing
3. Click **"Preview"** to see how it looks
4. Click **"Publish"** when ready to make it live

### Editing Unpublished Posts

For posts that were previously published but are now unpublished:

1. Click **"Create a revision draft"** to make changes
2. Changes go through the revision workflow
3. Publishing the revision will re-publish the article

---

## Working with Revisions

Revisions allow you to update published posts safely.

### What is a Revision?

A **revision** is a draft copy of a published post that you can edit without affecting the live version. When you publish a revision, it replaces the current live content.

### Creating a Revision

1. **Navigate to the published post**
   - Dashboard → Click "Edit" on any published post

2. **Create revision draft**
   - Click **"Create a revision draft"** button
   - You're redirected to `/admin/posts/{post_id}/revisions/new`

3. **Edit the revision**
   - All post fields are editable
   - Changes do NOT affect the live post yet
   - Form shows: "You're editing a draft revision..."

4. **Save your changes**
   - Click **"Save Draft"** to save without publishing
   - Click **"Preview"** to see how changes will look
   - Click **"Publish"** to make changes live

### Editing an Existing Revision

If you've already created a revision draft:

1. Navigate to the post edit page
2. If a draft revision exists, you'll see:
   - 🟡 Yellow inset: "This article has an unpublished draft revision"
   - Button: **"Edit draft revision"**
3. Click **"Edit draft revision"** to continue editing

### Publishing a Revision

When you publish a revision:

1. Click **"Publish"** on the revision edit page
2. The revision content replaces the live post
3. The old content is preserved in the database
4. Success message: "Revision published successfully"
5. The revision draft is automatically deleted
6. The live post now shows your updated content

### Deleting a Revision Draft

If you no longer want the changes in a revision:

1. Navigate to the revision edit page
2. Scroll to the bottom
3. Click **"Delete this revision draft"**
4. The revision is deleted
5. The live post remains unchanged

---

## Publishing & Unpublishing

### Publishing a Draft

**To publish a new draft:**

1. Edit the draft
2. Fill in all required fields
3. Click **"Publish"**
4. Success message appears
5. Post goes live immediately

**What happens when you publish:**
- Slug is generated (if new post)
- `published_at` timestamp is set
- Status changes to "Published"
- Post appears on the blog
- Static HTML is generated (when you run build)

### Unpublishing a Post

**To unpublish (remove from public view):**

1. Navigate to the published post edit page
2. Click **"Unpublish"** button
3. Confirm the action
4. The post is removed from public view
5. Status changes to "Unpublished"

**What happens when you unpublish:**
- Post is removed from the blog
- URL still exists in database
- Can be re-published later
- All content is preserved

### Re-publishing an Unpublished Post

To make an unpublished post live again:

1. Navigate to the unpublished post
2. Create a revision draft
3. Make any needed changes (or leave as-is)
4. Click **"Publish"**
5. The post goes live again

---

## Preview Posts

Preview lets you see how your post will look before publishing.

### How to Preview

**From Edit/New Page:**

1. Make your changes
2. Click **"Preview"** button
3. A new page opens showing the rendered post
4. Click "Back to edit" to return

**From Dashboard:**

1. Click **"Preview"** next to any post
2. View the post as it appears on the blog
3. Use browser back button to return

### Preview Features

- Shows the post exactly as it will appear when published
- Includes:
  - Title and author
  - Published date
  - Featured image
  - Full content (rendered from Markdown)
  - Source attribution
  - Disclosure notices
- **Does NOT save changes** - it's read-only

---

## Deleting Content

The CMS has different delete workflows depending on content state.

### Deleting a Draft (Never Published)

**When:** Post has never been published

**How:**

1. Navigate to the draft edit page
2. Scroll to the bottom
3. Section shows: **"Delete this draft"**
4. Click **"Delete draft"** button
5. Confirm the deletion
6. Draft is permanently deleted

**No deletion reason required** for drafts that were never published.

### Deleting a Published Article

**When:** Post is currently published or was published in the past

**How:**

1. Navigate to the post edit page
2. Scroll to the bottom
3. Section shows: **"Delete this article"**
4. Enter a **deletion reason** (required)
   - Example: "Outdated information", "Factual error", "Duplicate post"
5. Click **"Delete article"** button
6. Confirm the deletion

**Why deletion reason is required:**
- Maintains editorial accountability
- Audit trail for deleted content
- Helps track why content was removed

**What happens:**
- Post is soft-deleted (not permanently removed)
- `deleted_at` timestamp is set
- `deleted_by` records who deleted it
- `deleted_reason` stores your reason
- Post disappears from public view
- Can be recovered from database if needed

### Deleting a Revision Draft

**When:** You have an unpublished revision you no longer want

**How:**

1. Navigate to the revision edit page
2. Scroll to the bottom
3. Section shows: **"Delete this revision draft"**
4. Click **"Delete this revision draft"** button
5. Revision is deleted
6. Live post remains unchanged

---

## Understanding Post States

Posts can be in different states throughout their lifecycle.

### Post Status Types

| Status | Description | Can Edit? | Visible on Blog? |
|--------|-------------|-----------|------------------|
| **Draft** | Never been published | ✅ Yes, directly | ❌ No |
| **Published** | Currently live | ⚠️ Via revision only | ✅ Yes |
| **Unpublished** | Was published, now hidden | ⚠️ Via revision only | ❌ No |
| **Deleted** | Soft-deleted | ❌ No | ❌ No |

### Visual Indicators

The edit page shows colored inset text to indicate post state:

**🟡 Yellow Inset:**
```
You're editing a draft...
This post has not been published yet.
```
- Status: Draft (never published)
- Action: Can edit directly and publish

**🟢 Green Inset:**
```
You're viewing a published post...
Any changes must be made in a revision draft.
```
- Status: Published
- Action: Must create revision to make changes

**🔵 Blue Inset:**
```
You're viewing an unpublished post...
Any changes must be made in a revision draft.
```
- Status: Unpublished
- Action: Must create revision to re-publish

### Revision Status

When editing a revision draft:

**🟡 Yellow Inset:**
```
You're editing a draft revision...
Changes will replace the live version when published.
```

### Dashboard Status Column

The dashboard shows:
- **"Draft"** - Never published
- **"Published"** - Currently live
- **"Unpublished"** - Was published, now hidden

---

## Markdown Guide

The content field supports Markdown formatting.

### Basic Formatting

```markdown
# Heading 1
## Heading 2
### Heading 3

**Bold text**
*Italic text*

[Link text](https://example.com)

![Image alt text](image-url.jpg)
```

### Lists

**Unordered list:**
```markdown
- Item 1
- Item 2
- Item 3
```

**Ordered list:**
```markdown
1. First item
2. Second item
3. Third item
```

### Blockquotes

```markdown
> This is a quoted text.
> It can span multiple lines.
```

### YouTube Embeds

Use the custom YouTube syntax:

```markdown
[youtube:VIDEO_ID]
```

**Examples:**
```markdown
[youtube:dQw4w9WgXcQ]
[youtube:https://www.youtube.com/watch?v=dQw4w9WgXcQ]
[youtube:https://youtu.be/dQw4w9WgXcQ]
```

All formats work - the video ID is automatically extracted.

### Code Blocks

**Inline code:**
```markdown
Use `code` for inline code.
```

**Code blocks:**
````markdown
```javascript
function hello() {
  console.log("Hello World");
}
```
````

### Paragraphs

Leave a blank line between paragraphs:

```markdown
This is paragraph one.

This is paragraph two.
```

---

## Best Practices

### Content Creation

✅ **DO:**
- Write clear, descriptive titles
- Fill in summaries (helps with SEO)
- Use Markdown formatting for readability
- Preview before publishing
- Add source attribution when appropriate
- Use disclosure fields for transparency
- Save drafts frequently

❌ **DON'T:**
- Publish without previewing
- Leave title or content empty
- Use special characters in titles that don't render well
- Delete published posts without a reason
- Edit published posts directly (use revisions)

### Workflow Recommendations

**For New Content:**
1. Create draft
2. Write content
3. Preview multiple times
4. Publish when ready

**For Updates to Published Posts:**
1. Create revision draft
2. Make changes
3. Preview the revision
4. Publish to update live post

**For Scheduled Content:**
1. Create draft
2. Complete content
3. Save as draft until publication date
4. Publish when ready

### Revision Management

- **Create revisions early** if you know you need to update a post
- **Preview revisions** before publishing
- **Delete unused revisions** to keep workspace clean
- **Don't create multiple revisions** - only one can exist per post

### Deletion Guidelines

- **Only delete when necessary** - unpublish instead if you might need it later
- **Always provide detailed deletion reasons** for published content
- **Check for external links** to the post before deleting
- **Coordinate with SEO** if the post ranks well

---

## Troubleshooting

### "This article has a draft revision" message

**Problem:** You see a yellow banner saying the article has a draft revision.

**Solution:** Click "Edit draft revision" to continue editing the existing revision, or delete it if you no longer need it.

### Cannot edit published post

**Problem:** Edit button is disabled or shows "Create revision" instead.

**Solution:** This is expected behavior. Create a revision draft to make changes to published posts.

### Preview shows old content

**Problem:** Preview doesn't show your latest changes.

**Solution:** Preview doesn't save changes. Click "Save Draft" first, then preview.

### Publish button not working

**Problem:** Clicking publish doesn't publish the post.

**Solution:** Check for validation errors at the top of the page. Ensure title and content are filled in.

### Post not appearing on blog after publishing

**Problem:** Published post doesn't show on the blog.

**Solution:**
1. Check if the post is actually published (status = "Published")
2. Run the build script: `npm run build`
3. Deploy updated static files: `npm run deploy`

### Lost unsaved changes

**Problem:** Accidentally navigated away and lost changes.

**Solution:**
- Always click "Save Draft" frequently
- Use browser back button immediately after navigating away
- Content may still be in browser cache

---

## Quick Reference

### Common Actions

| Task | Path | Button |
|------|------|--------|
| Create new post | `/admin/posts/new` | "Publish" or "Save Draft" |
| Edit draft | `/admin/posts/{id}/edit` | Edit directly |
| Update published post | `/admin/posts/{id}/edit` → Create revision | "Create a revision draft" |
| Preview post | Any edit page | "Preview" |
| Delete draft | Draft edit page, bottom | "Delete draft" |
| Delete published post | Post edit page, bottom | "Delete article" |
| Unpublish post | Published post edit page | "Unpublish" |

### Keyboard Shortcuts

(If implemented in future - placeholder section)

---

## Support

For technical issues or questions:

- Check the [SECURITY.md](../SECURITY.md) for security best practices
- Check the [LOGGING.md](../LOGGING.md) for troubleshooting server logs
- Contact your system administrator
- Review application logs in `logs/` directory

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

**Last Updated:** December 2025
**CMS Version:** 1.0.0
