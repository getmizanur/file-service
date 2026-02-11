# Authors Page

Documentation for the author profile pages feature.

---

## Overview

The authors page displays an author's profile with their bio and a complete list of all articles they've written. Each author has a unique URL based on their slug.

**URL Format:** `/authors/{author-slug}/index.html`

**Example:** `/authors/john-smith/index.html`

---

## Features

✅ **Author Profile Header**
- Author name in Anton font (large, bold, uppercase)
- Avatar image (if available)
- Bio/description
- Article count

✅ **Articles List**
- Bulleted list format
- Shows all published articles by the author
- Includes article title, date, category tag
- Excerpt/summary for each article
- "Read article →" link

✅ **Responsive Design**
- Mobile-friendly layout
- Adapts to different screen sizes

---

## File Structure

### Controller
**Location:** `application/module/blog/controller/authors-controller.js`

**Action:** `listAction()`

**Route:** Configured in `routes.config.js`:
```javascript
"blogAuthorsList": {
  "route": "/authors/:slug/index.html",
  "module": "blog",
  "controller": "authors",
  "action": "list"
}
```

### Template
**Location:** `view/application/blog/authors/list.njk`

**Variables:**
- `author` - Author object (id, name, email, bio, avatar, slug)
- `posts` - Array of published posts by the author
- `totalPosts` - Count of posts

### CSS
**Location:** `public/css/module/blog/authors/list.css`

**Key Styles:**
- `.author-name` - Anton font, 48px, uppercase
- `.articles-list` - Bulleted list (disc style)
- `.article-item` - Individual article with bottom border

---

## Database Schema

### Users Table (Authors)

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    bio TEXT,
    avatar VARCHAR(500),
    slug VARCHAR(64),
    role VARCHAR(20) DEFAULT 'author',
    -- ... other fields
);
```

**Important Fields:**
- `slug` - Unique identifier for author URLs
- `name` - Display name
- `bio` - Author biography/description
- `avatar` - Profile image URL

---

## Setup

### 1. Ensure Authors Have Slugs

Authors need a unique `slug` to have a profile page. Generate slugs if they don't exist:

```sql
-- Check which authors are missing slugs
SELECT id, name, slug FROM users WHERE slug IS NULL;

-- Generate slugs (example - adjust as needed)
UPDATE users
SET slug = LOWER(REPLACE(name, ' ', '-'))
WHERE slug IS NULL;

-- Make slugs URL-safe (remove special characters)
UPDATE users
SET slug = REGEXP_REPLACE(LOWER(slug), '[^a-z0-9-]', '', 'g')
WHERE slug IS NOT NULL;

-- Ensure uniqueness if needed
UPDATE users
SET slug = slug || '-' || id
WHERE slug IN (
    SELECT slug FROM users GROUP BY slug HAVING COUNT(*) > 1
);
```

### 2. Verify Author Data

```sql
-- Check author profile completeness
SELECT
    id,
    name,
    slug,
    CASE WHEN bio IS NOT NULL THEN 'Yes' ELSE 'No' END as has_bio,
    CASE WHEN avatar IS NOT NULL THEN 'Yes' ELSE 'No' END as has_avatar,
    (SELECT COUNT(*) FROM posts WHERE author_id = users.id AND status = 'published') as post_count
FROM users
ORDER BY id;
```

### 3. Test the Page

Visit an author's page:
```
http://localhost:8080/authors/john-smith/index.html
```

Replace `john-smith` with an actual author slug from your database.

---

## Usage

### Linking to Author Pages

In templates, link to an author's page using their slug:

```html
<a href="/authors/{{ author.slug }}/index.html">{{ author.name }}</a>
```

### From Post Templates

If you have the author information in a post:

```html
<p>By <a href="/authors/{{ author_slug }}/index.html">{{ author_name }}</a></p>
```

---

## Template Structure

### Author Header
```html
<header class="author-header">
  <div class="author-avatar">
    <img src="{{ author.avatar }}" alt="{{ author.name }}">
  </div>
  <div class="author-info">
    <h1 class="author-name">{{ author.name }}</h1>
    <div class="author-bio">{{ author.bio }}</div>
    <p class="author-stats">X articles published</p>
  </div>
</header>
```

### Articles List
```html
<ul class="articles-list">
  <li class="article-item">
    <article>
      <h3><a href="/articles/...">Article Title</a></h3>
      <div class="article-meta">Date • Category</div>
      <div class="article-excerpt">Excerpt...</div>
      <a href="/articles/...">Read article →</a>
    </article>
  </li>
</ul>
```

---

## Customization

### Changing Author Name Font

Edit `list.css`:
```css
.author-name {
  font-family: 'Anton', sans-serif;  /* Change font here */
  font-size: 48px;                    /* Adjust size */
  text-transform: uppercase;          /* Remove if not needed */
}
```

Don't forget to update the Google Fonts link in the template if changing fonts.

### Changing List Style

Edit `list.css`:
```css
.articles-list {
  list-style: disc;      /* disc, circle, square, none */
  padding-left: 25px;    /* Adjust indentation */
}
```

### Hiding Excerpts

In the template, remove or comment out:
```html
{% if post.excerpt_html %}
<div class="article-excerpt">
  {{ post.excerpt_html | safe }}
</div>
{% endif %}
```

---

## Static Site Generation

To include author pages in your static build, add them to the build script:

```javascript
// In scripts/build-script.js

// Generate author pages
const authors = await db.query('SELECT slug FROM users WHERE slug IS NOT NULL');

for (const author of authors) {
  const url = `/authors/${author.slug}/index.html`;
  await generatePage(url);
}
```

---

## SEO Considerations

### Meta Tags

Add to the template for better SEO:
```html
{% block headMeta %}
<meta name="description" content="Articles by {{ author.name }} - {{ totalPosts }} articles published">
<meta property="og:title" content="{{ author.name }} - Author Profile">
<meta property="og:description" content="{{ author.bio }}">
{% if author.avatar %}
<meta property="og:image" content="{{ author.avatar }}">
{% endif %}
{% endblock %}
```

### Canonical URL

```html
<link rel="canonical" href="https://yoursite.com/authors/{{ author.slug }}/index.html">
```

---

## Troubleshooting

### Issue: Author page returns 404

**Causes:**
1. Author slug doesn't exist in database
2. Route not configured correctly
3. Controller file name mismatch

**Solutions:**
```sql
-- Verify author exists
SELECT id, name, slug FROM users WHERE slug = 'author-slug-here';

-- Check route configuration
-- Ensure route in routes.config.js matches controller name
```

### Issue: No articles showing

**Causes:**
1. Author has no published posts
2. Posts have `deleted_at` set
3. Author ID mismatch

**Debug:**
```sql
-- Check author's posts
SELECT
    p.id,
    p.title,
    p.status,
    p.deleted_at
FROM posts p
WHERE p.author_id = 123  -- Replace with actual author ID
ORDER BY p.published_at DESC;
```

### Issue: Avatar not displaying

**Causes:**
1. Avatar URL is invalid
2. CORS issues
3. Missing image file

**Solutions:**
- Verify avatar URL in database
- Check browser console for errors
- Ensure image is accessible

---

## Testing Checklist

Before deploying:

- [ ] Authors have slugs generated
- [ ] Test page loads: `/authors/test-author/index.html`
- [ ] Author name displays in Anton font
- [ ] Articles show as bulleted list
- [ ] Article links work correctly
- [ ] Category tags display with colors
- [ ] Mobile responsive layout works
- [ ] No Recent Posts sidebar (as requested)
- [ ] Build script includes author pages

---

## Related Files

- **Controller:** `application/module/blog/controller/authors-controller.js`
- **Template:** `view/application/blog/authors/list.njk`
- **CSS:** `public/css/module/blog/authors/list.css`
- **Route Config:** `application/config/routes.config.js`
- **Schema:** `database/schema.sql` (users table)

---

## New Feature: Presentation Styles for Authors

### Overview
Authors can now have custom presentation styles applied to their profile pages. This feature allows for greater flexibility in styling and branding.

### Database Changes
- **Entity Presentation Styles Table**: Authors are now included in the `entity_presentation_styles` table.
  - `entity_type`: Set to `authors` for author-specific styles.
  - `style_id`: References the presentation style to be applied.

### Implementation
1. **Controller Update**:
   - The `authors-controller.js` now resolves presentation styles via the `entity_presentation_styles` table.
2. **Template Update**:
   - The `list.njk` template dynamically applies the resolved presentation style.

### Testing
- Verify that authors with assigned styles render correctly.
- Ensure fallback styles are applied for authors without a specific style.

---

**Last Updated:** December 2025
