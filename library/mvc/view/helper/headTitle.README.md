# headTitle Helper - Usage Guide

The `headTitle` helper allows you to build page titles incrementally across your templates and even append from the controller.

## How It Works

The helper uses Nunjucks context to store title parts, allowing you to build the title across multiple calls in your template. The title parts are stored in a hidden context variable `_headTitleParts`.

## Usage in Templates

### 1. Set a Title (Replaces any existing title)

```njk
{{ headTitle('Daily Politics') }}
```

This sets the title to "Daily Politics" and returns an empty string (doesn't render yet).

### 2. Append to Title

```njk
{{ headTitle('Daily Politics', 'set') }}
{{ headTitle('Admin Interface', 'append') }}
```

This will build: "Daily Politics - Admin Interface"

### 3. Prepend to Title

```njk
{{ headTitle('Admin Interface', 'set') }}
{{ headTitle('Daily Politics', 'prepend') }}
```

This will build: "Daily Politics - Admin Interface"

### 4. Render the Title

In your layout/master template, call headTitle without arguments or with 'render' mode to output the final title:

```njk
<head>
    <title>{{ headTitle() }}</title>
</head>
```

Or explicitly:

```njk
<head>
    <title>{{ headTitle(null, 'render') }}</title>
</head>
```

## Complete Example

### In your page template (edit-article.njk):

```njk
{{ headTitle('Edit Article', 'set') }}

<h1>Edit Article</h1>
<!-- Your form here -->
```

### In your layout template (master.njk):

```njk
<!DOCTYPE html>
<html>
<head>
    <title>{{ headTitle('Admin Panel', 'append') }}</title>
</head>
<body>
    {% block content %}{% endblock %}
</body>
</html>
```

**Final rendered title:** "Edit Article - Admin Panel"

## Appending from Controller

You can also manipulate the title from your controller by setting a template variable:

### In Controller:

```javascript
editArticleAction() {
    // Set the base title from controller
    this.getView().setVariable('_headTitleParts', ['Edit Article']);

    // Or append to existing title
    const currentParts = this.getView().getVariable('_headTitleParts', []);
    currentParts.push('Admin Interface');
    this.getView().setVariable('_headTitleParts', currentParts);

    // ... rest of your action
}
```

### In Template:

```njk
{# Title is already set from controller, just append more if needed #}
{{ headTitle('CMS', 'append') }}

<head>
    <title>{{ headTitle() }}</title>
</head>
```

**Final rendered title:** "Edit Article - Admin Interface - CMS"

## Configuration

Default separator: ` - ` (space-dash-space)
Default title: `Application Portal` (used when no title is set)

These can be customized by modifying the HeadTitle class constructor in `/library/mvc/view/helper/head-title.js`.

## Important Notes

1. **Order matters**: The order you call `headTitle()` determines the order of title parts
2. **Modes**:
   - `'set'` - Replace all existing title parts (default)
   - `'append'` - Add to the end
   - `'prepend'` - Add to the beginning
   - `'render'` - Just output, don't modify
3. **Empty string vs rendered**: Calls with 'set', 'append', or 'prepend' return empty string. Only rendering shows the title.
4. **Context-aware**: The helper stores state in Nunjucks context, so it persists across includes and extends within the same render.
