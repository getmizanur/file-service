# headMeta Helper - Usage Guide

The `headMeta` helper allows you to build meta tags incrementally across your templates and even set them from the controller.

## How It Works

The helper uses Nunjucks context to store meta tags in a hidden context variable `_headMetaTags`, allowing you to add meta tags across multiple calls and render them all at once.

## Usage in Templates

### 1. Add Standard Meta Tags

```njk
{# Add description meta tag #}
{{ headMeta('description', 'Daily Politics - UK Political News and Analysis') }}

{# Add keywords meta tag #}
{{ headMeta('keywords', 'politics, UK, news, parliament') }}

{# Add viewport meta tag #}
{{ headMeta('viewport', 'width=device-width, initial-scale=1.0') }}

{# Add robots meta tag #}
{{ headMeta('robots', 'index, follow') }}
```

### 2. Add Open Graph Meta Tags

```njk
{# OG tags are automatically detected by 'og:' prefix #}
{{ headMeta('og:title', 'Daily Politics - Latest Political News') }}
{{ headMeta('og:description', 'Comprehensive coverage of UK politics') }}
{{ headMeta('og:image', 'https://dailypolitics.com/images/og-image.jpg') }}
{{ headMeta('og:url', 'https://dailypolitics.com') }}
{{ headMeta('og:type', 'website') }}
```

### 3. Add Twitter Card Meta Tags

```njk
{# Twitter tags are automatically detected by 'twitter:' prefix #}
{{ headMeta('twitter:card', 'summary_large_image') }}
{{ headMeta('twitter:site', '@DailyPolitics') }}
{{ headMeta('twitter:title', 'Daily Politics News') }}
{{ headMeta('twitter:description', 'Latest political news and analysis') }}
{{ headMeta('twitter:image', 'https://dailypolitics.com/images/twitter-card.jpg') }}
```

### 4. Add Meta Tags Using Object Format

```njk
{# Pass an object with all attributes #}
{{ headMeta({ name: 'author', content: 'Daily Politics Editorial Team' }) }}
{{ headMeta({ property: 'og:locale', content: 'en_GB' }) }}
{{ headMeta({ charset: 'utf-8' }) }}
{{ headMeta({ 'http-equiv': 'X-UA-Compatible', content: 'IE=edge' }) }}
```

### 5. Render Meta Tags

In your layout/master template, call `headMeta()` without arguments to render all collected meta tags:

```njk
<head>
    <meta charset="utf-8">
    {{ headMeta() | safe }}
    <title>{{ headTitle() }}</title>
</head>
```

Or explicitly:

```njk
<head>
    {{ headMeta('render') | safe }}
</head>
```

## Complete Example

### In your page template (article.njk):

```njk
{# Set article-specific meta tags #}
{{ headMeta('description', post.excerpt or post.meta_description) }}
{{ headMeta('keywords', post.tags.join(', ')) }}

{# Open Graph tags for social sharing #}
{{ headMeta('og:title', post.title) }}
{{ headMeta('og:description', post.excerpt) }}
{{ headMeta('og:image', post.hero_image_url) }}
{{ headMeta('og:url', 'https://dailypolitics.com/' + post.category_slug + '/articles/' + post.slug) }}
{{ headMeta('og:type', 'article') }}

{# Twitter Card tags #}
{{ headMeta('twitter:card', 'summary_large_image') }}
{{ headMeta('twitter:title', post.title) }}
{{ headMeta('twitter:description', post.excerpt) }}
{{ headMeta('twitter:image', post.hero_image_url) }}

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

    {# Add default meta tags #}
    {{ headMeta('robots', 'index, follow') }}
    {{ headMeta('og:site_name', 'Daily Politics') }}

    {# Render all meta tags (including those from child templates) #}
    {{ headMeta() | safe }}

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
    <meta name="robots" content="index, follow">
    <meta property="og:site_name" content="Daily Politics">
    <meta name="description" content="Breaking news from Westminster">
    <meta name="keywords" content="politics, parliament, government">
    <meta property="og:title" content="Brexit Vote Results">
    <meta property="og:description" content="Breaking news from Westminster">
    <meta property="og:image" content="https://dailypolitics.com/images/brexit.jpg">
    <meta property="og:url" content="https://dailypolitics.com/uk/articles/brexit-vote">
    <meta property="og:type" content="article">
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:title" content="Brexit Vote Results">
    <meta property="twitter:description" content="Breaking news from Westminster">
    <meta property="twitter:image" content="https://dailypolitics.com/images/brexit.jpg">

    <title>Brexit Vote Results - Daily Politics</title>
</head>
```

## Setting from Controller

You can also set meta tags from your controller by directly setting the context variable:

### In Controller:

```javascript
articleAction() {
    const post = await this.postService.getPostBySlug(slug);

    // Set meta tags from controller
    const metaTags = {
        'description': {
            name: 'description',
            content: post.meta_description || post.excerpt
        },
        'og:title': {
            property: 'og:title',
            content: post.title
        },
        'og:description': {
            property: 'og:description',
            content: post.excerpt
        },
        'og:image': {
            property: 'og:image',
            content: post.hero_image_url
        }
    };

    this.getView().setVariable('_headMetaTags', metaTags);
    this.getView().setVariable('post', post);
}
```

### In Template:

```njk
{# Meta tags already set from controller, just add more if needed #}
{{ headMeta('author', post.author_name) }}

{# Render all meta tags #}
<head>
    {{ headMeta() | safe }}
</head>
```

## Modes

- **`'add'`** (default) - Add meta tag to collection (overwrites if same name/property exists)
- **`'set'`** - Clear all existing meta tags and set new one
- **`'render'`** - Just render, don't modify collection

## Important Notes

1. **Deduplication**: Meta tags with the same `name` or `property` will overwrite previous ones
2. **Auto-detection**: Tags starting with `og:` or `twitter:` automatically use `property` instead of `name` attribute
3. **Safe output**: Always use `| safe` filter when rendering: `{{ headMeta() | safe }}`
4. **Context-aware**: Meta tags persist across includes and extends within the same render
5. **HTML escaping**: All attribute values are automatically HTML-escaped for security

## Common Meta Tags Reference

### Standard HTML Meta Tags
- `description` - Page description for search engines
- `keywords` - Comma-separated keywords
- `author` - Content author
- `viewport` - Mobile viewport settings
- `robots` - Search engine crawling instructions

### Open Graph (Facebook, LinkedIn)
- `og:title` - Content title
- `og:description` - Content description
- `og:image` - Preview image URL
- `og:url` - Canonical URL
- `og:type` - Content type (article, website, etc.)
- `og:site_name` - Site name

### Twitter Cards
- `twitter:card` - Card type (summary, summary_large_image)
- `twitter:site` - Twitter handle
- `twitter:title` - Content title
- `twitter:description` - Content description
- `twitter:image` - Preview image URL
