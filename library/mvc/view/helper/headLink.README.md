# headLink Helper - Usage Guide

The `headLink` helper allows you to build `<link>` tags incrementally across your templates and even set them from the controller.

## How It Works

The helper uses Nunjucks context to store link tags in a hidden context variable `_headLinkTags`, allowing you to add link tags across multiple calls and render them all at once.

## Usage in Templates

### 1. Add Stylesheet Links

```njk
{# Add stylesheet using object format #}
{{ headLink({ rel: 'stylesheet', href: '/css/main.css' }) }}

{# Add stylesheet with media query #}
{{ headLink({ rel: 'stylesheet', href: '/css/print.css', media: 'print' }) }}

{# Add external stylesheet #}
{{ headLink({ rel: 'stylesheet', href: 'https://cdn.example.com/bootstrap.min.css' }) }}
```

### 2. Add Favicon

```njk
{# Add favicon using object format #}
{{ headLink({ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }) }}

{# Add PNG favicon #}
{{ headLink({ rel: 'icon', type: 'image/png', href: '/images/favicon-32x32.png', sizes: '32x32' }) }}

{# Add apple touch icon #}
{{ headLink({ rel: 'apple-touch-icon', sizes: '180x180', href: '/images/apple-touch-icon.png' }) }}
```

### 3. Add Canonical Link

```njk
{# Add canonical URL #}
{{ headLink({ rel: 'canonical', href: 'https://dailypolitics.com/uk/articles/brexit-news' }) }}
```

### 4. Add Alternate Links (for multilingual sites)

```njk
{# Add alternate language versions #}
{{ headLink({ rel: 'alternate', hreflang: 'en-GB', href: 'https://dailypolitics.com/en/article' }) }}
{{ headLink({ rel: 'alternate', hreflang: 'en-US', href: 'https://dailypolitics.com/us/article' }) }}
{{ headLink({ rel: 'alternate', hreflang: 'fr', href: 'https://dailypolitics.fr/article' }) }}
```

### 5. Add Preload/Prefetch Links

```njk
{# Preload critical resources #}
{{ headLink({ rel: 'preload', href: '/fonts/roboto.woff2', as: 'font', type: 'font/woff2', crossorigin: 'anonymous' }) }}
{{ headLink({ rel: 'preload', href: '/css/critical.css', as: 'style' }) }}

{# Prefetch next page #}
{{ headLink({ rel: 'prefetch', href: '/next-article.html' }) }}

{# DNS prefetch #}
{{ headLink({ rel: 'dns-prefetch', href: '//cdn.dailypolitics.com' }) }}
```

### 6. Add RSS/Atom Feeds

```njk
{# Add RSS feed link #}
{{ headLink({ rel: 'alternate', type: 'application/rss+xml', title: 'Daily Politics RSS Feed', href: '/feed/rss.xml' }) }}

{# Add Atom feed link #}
{{ headLink({ rel: 'alternate', type: 'application/atom+xml', title: 'Daily Politics Atom Feed', href: '/feed/atom.xml' }) }}
```

### 7. Render Link Tags

In your layout/master template, call `headLink()` without arguments to render all collected link tags:

```njk
<head>
    <meta charset="utf-8">
    <title>{{ headTitle() }}</title>
    {{ headLink() | safe }}
</head>
```

Or explicitly:

```njk
<head>
    {{ headLink('render') | safe }}
</head>
```

## Helper Methods

The `headLink` helper provides convenient shortcut methods:

### 1. Stylesheet Helper

```njk
{# Instead of: {{ headLink({ rel: 'stylesheet', href: '/css/main.css' }) }} #}
{{ headLink.stylesheet('/css/main.css') }}

{# With extra attributes #}
{{ headLink.stylesheet('/css/print.css', { media: 'print' }) }}
```

### 2. Favicon Helper

```njk
{# Instead of: {{ headLink({ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }) }} #}
{{ headLink.favicon('/favicon.ico') }}

{# With custom MIME type #}
{{ headLink.favicon('/favicon.png', 'image/png') }}
```

### 3. Canonical Helper

```njk
{# Instead of: {{ headLink({ rel: 'canonical', href: 'https://...' }) }} #}
{{ headLink.canonical('https://dailypolitics.com/uk/articles/brexit-news') }}
```

## Complete Example

### In your page template (article.njk):

```njk
{# Add article-specific links #}
{{ headLink.canonical('https://dailypolitics.com/' + post.category_slug + '/articles/' + post.slug) }}

{# Add article stylesheet #}
{{ headLink.stylesheet('/css/article.css') }}

{# Preload hero image #}
{{ headLink({ rel: 'preload', href: post.hero_image_url, as: 'image' }) }}

{# Add prev/next article links #}
{% if prevArticle %}
{{ headLink({ rel: 'prev', href: '/' + prevArticle.category_slug + '/articles/' + prevArticle.slug }) }}
{% endif %}
{% if nextArticle %}
{{ headLink({ rel: 'next', href: '/' + nextArticle.category_slug + '/articles/' + nextArticle.slug }) }}
{% endif %}

<article>
    <h1>{{ post.title }}</h1>
    <div>{{ post.content | safe }}</div>
</article>
```

### In your layout template (master.njk):

```njk
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    {# Add global links #}
    {{ headLink.favicon('/favicon.ico') }}
    {{ headLink.stylesheet('/css/main.css') }}
    {{ headLink({ rel: 'alternate', type: 'application/rss+xml', title: 'RSS Feed', href: '/feed.xml' }) }}

    {# Render all link tags (including those from child templates) #}
    {{ headLink() | safe }}

    <title>{{ headTitle() }}</title>
</head>
<body>
    {% block content %}{% endblock %}
</body>
</html>
```

**Final rendered output:**
```html
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="stylesheet" href="/css/main.css">
    <link rel="alternate" type="application/rss+xml" title="RSS Feed" href="/feed.xml">
    <link rel="canonical" href="https://dailypolitics.com/uk/articles/brexit-news">
    <link rel="stylesheet" href="/css/article.css">
    <link rel="preload" href="https://cdn.dailypolitics.com/images/brexit.jpg" as="image">
    <link rel="prev" href="/uk/articles/previous-article">
    <link rel="next" href="/uk/articles/next-article">

    <title>Brexit News - Daily Politics</title>
</head>
```

## Setting from Controller

You can also set link tags from your controller by directly setting the context variable:

### In Controller:

```javascript
articleAction() {
    const post = await this.postService.getPostBySlug(slug);
    const { prevArticle, nextArticle } = await this.postService.getAdjacentArticles(post.id);

    // Set link tags from controller
    const linkTags = [
        {
            rel: 'canonical',
            href: `https://dailypolitics.com/${post.category_slug}/articles/${post.slug}`
        },
        {
            rel: 'stylesheet',
            href: '/css/article.css'
        }
    ];

    if (prevArticle) {
        linkTags.push({
            rel: 'prev',
            href: `/${prevArticle.category_slug}/articles/${prevArticle.slug}`
        });
    }

    if (nextArticle) {
        linkTags.push({
            rel: 'next',
            href: `/${nextArticle.category_slug}/articles/${nextArticle.slug}`
        });
    }

    this.getView().setVariable('_headLinkTags', linkTags);
    this.getView().setVariable('post', post);
}
```

### In Template:

```njk
{# Link tags already set from controller, just add more if needed #}
{{ headLink.favicon('/favicon.ico') }}

{# Render all link tags #}
<head>
    {{ headLink() | safe }}
</head>
```

## Modes

- **`'add'`** (default) - Add link tag to collection (avoids duplicates based on rel+href)
- **`'set'`** - Clear all existing link tags and set new one
- **`'render'`** - Just render, don't modify collection

## Important Notes

1. **Deduplication**: Link tags with the same `rel` and `href` will be updated instead of duplicated
2. **Safe output**: Always use `| safe` filter when rendering: `{{ headLink() | safe }}`
3. **Context-aware**: Link tags persist across includes and extends within the same render
4. **HTML escaping**: All attribute values are automatically HTML-escaped for security
5. **Order matters**: Links are rendered in the order they were added

## Common Link Types Reference

### Resource Links
- `stylesheet` - CSS stylesheet
- `icon` - Favicon
- `apple-touch-icon` - iOS home screen icon
- `manifest` - Web app manifest

### Navigation Links
- `canonical` - Preferred URL for content
- `alternate` - Alternate version (language, format)
- `prev` - Previous page in sequence
- `next` - Next page in sequence

### Performance Optimization
- `preload` - High-priority resource to load early
- `prefetch` - Low-priority resource for next navigation
- `preconnect` - Establish connection to origin early
- `dns-prefetch` - Resolve DNS early

### Feeds
- `alternate` (RSS) - type="application/rss+xml"
- `alternate` (Atom) - type="application/atom+xml"
