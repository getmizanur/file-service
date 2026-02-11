# Glossary

## A

### AbstractService
Base class for all service classes in the application. Provides common functionality including ServiceManager access, database connection, and shared utility methods. Located in `library/service/abstract-service.js`.

### Action
A method in a controller that handles a specific request. Actions are suffixed with "Action" (e.g., `indexAction`, `saveAction`, `deleteAction`). They receive the request/response objects and orchestrate the application logic.

### Adapter Pattern
Design pattern used extensively in the framework for database connections, authentication, caching, and sessions. Allows multiple implementations to share a common interface.

### Audit Fields
Standard database columns for tracking record history: `created_at`, `created_by`, `updated_at`, `updated_by`. Used for accountability and revision tracking.

### Author
Content creator entity in the system. Authors have profiles with biographies and can be associated with multiple posts. Each author has their own presentation style and dedicated author page.

## B

### BaseController
Parent class for all controllers, providing plugin access, view rendering, and common controller functionality. Located in `library/mvc/controller/base-controller.js`.

### Bootstrap
The initialization phase of the application where configuration is loaded, services are registered, middleware is attached, and routes are configured. Executed in `Application.bootstrap()`.

### Build Script
Custom static site generator (`scripts/build-script.js`) that pre-renders all dynamic content into static HTML files for deployment to S3/CloudFront.

## C

### Cache Backend
Storage mechanism for cached data. Supported backends: File (development), Redis (production), Memcache. Configured in `application.config.js`.

### Cache Frontend
Interface for cache operations (get, set, delete) that abstracts the underlying backend implementation. The Core frontend provides automatic serialization.

### Category
Content classification entity. Posts are assigned to categories, which have their own presentation styles and URL slugs. Categories can be hierarchical.

### Controller
MVC component responsible for handling HTTP requests, coordinating services, and preparing view data. Controllers extend `BaseController` and contain action methods.

### CSRF Protection
Cross-Site Request Forgery protection mechanism that validates tokens on form submissions to prevent unauthorized requests.

## D

### Database Adapter
Abstraction layer for database connections. Implementations: `PostgreSQLAdapter`, `MySQLAdapter`, `SQLiteAdapter`, `SqlServerAdapter`. Located in `library/db/adapter/`.

### DatabaseService
Service that provides direct database access to other services. Returns database adapter instance configured from environment variables.

### DbAdapter
Authentication adapter that validates credentials against database records using salted MD5 hashing. Located in `library/authentication/adapter/db-adapter.js`.

### Disclosure Note
Optional field on posts for transparency notes (e.g., corrections, updates, conflicts of interest). Rendered in markdown at the bottom of articles.

### Draft Revision
Unpublished revision of a post that exists in `post_revisions` table. Used for staging changes before publication.

## E

### Entity
Data transfer object representing a database record. Entities have `exchangeData()` for population and `toObject()` for serialization. Examples: `PostEntity`, `PostRevisionEntity`.

### Entity Presentation Styles
Junction table (`entity_presentation_styles`) that associates any entity type with presentation styles. Replaces direct foreign keys for flexible style assignment.

### Entity Type
String identifier for the type of entity in the `entity_presentation_styles` table. Examples: 'posts', 'categories', 'authors'. Corresponds to table names.

### exchangeData()
Method on entities that populates internal storage from a plain object. Validates and transforms data before storage.

## F

### Factory
Service factory pattern used by ServiceManager to instantiate services with their dependencies. Factories are located in `application/service/factory/`.

### Flash Message
Temporary message stored in session that displays once on the next page load. Types: success (confirmation), info (information), error (warning). Accessed via `flashMessenger` plugin.

### Foreign Key
Database constraint ensuring referential integrity between tables. Example: `posts.category_id` references `categories.id`.

## G

### GOV.UK Design System
UK government design patterns used for admin interface styling, particularly the panel component for flash messages.

## H

### Helmet.js
Security middleware that sets HTTP headers for protection against common vulnerabilities (XSS, clickjacking, MIME sniffing, etc.).

### httpOnly Cookie
Security flag on session cookies that prevents JavaScript access, mitigating XSS attacks.

## I

### Identity
User data stored in session after successful authentication. Contains user record minus sensitive fields (password_hash, password_salt).

### is_active Field
Boolean database column on users table. Only users with `is_active = true` can authenticate. Allows soft-disabling of accounts.

## J

### Junction Table
Database table that connects two other tables in a many-to-many relationship. Example: `entity_presentation_styles` connects entities to presentation styles.

## L

### Layout
Master template that wraps content views. Layouts provide consistent structure across pages. Set via `layout()` plugin in controllers.

### Logger
Logging system in `library/logger/` supporting multiple transports (console, file) and log levels (error, warn, info, debug).

## M

### Markdown
Lightweight markup language used for post content. Rendered to HTML via the `marked` library with pre-rendering stored in database.

### Meta Fields
SEO-related fields: `meta_title` (for `<title>` tag) and `meta_description` (for meta description tag). Optimizes search engine presentation.

### Middleware
Express.js functions that process requests before they reach controllers. Examples: authentication checks, logging, body parsing.

### Migration
SQL script that modifies database schema. Located in `database/migration/` with sequential numbering (001, 002, etc.). Each has a corresponding rollback script.

### MVC (Model-View-Controller)
Architectural pattern separating data (Model/Entity), presentation (View), and logic (Controller) for maintainability and testability.

## N

### Nunjucks
Templating engine for server-side HTML rendering. Uses `.njk` file extension. Supports inheritance, includes, filters, and custom globals.

## P

### params Plugin
Controller plugin for accessing request parameters (route params, query string, POST body). Usage: `this.params().get('id')`.

### Plugin
Reusable controller functionality accessed via `PluginManager`. Built-in plugins: params, redirect, url, layout, session, flashMessenger.

### PluginManager
Manages controller plugins and provides access to them. Instantiated per-request in `BaseController`.

### Post
Primary content entity representing an article. Contains title, slug, content (markdown and HTML), category, author, publication status, and audit fields.

### PostEntity
Data entity representing a post record with validation and transformation logic.

### PostRevisionEntity
Data entity representing a revision snapshot of a post.

### PostRevisionService
Service handling post revision operations: creating drafts, retrieving history, comparing versions.

### PostService
Service handling post operations: CRUD, publishing, querying with filters, static site generation.

### PostgreSQL
Primary relational database management system. Default and recommended database for production.

### Presentation Style
Visual treatment for content (e.g., "Breaking", "Government Updates", "Analysis"). Defined in `presentation_styles` table with name, slug, and CSS classes.

### Published Post
Post with non-null `published_at` timestamp, indicating it's live and visible to the public.

## Q

### Query Builder
Programmatic SQL construction classes: `Select`, `Insert`, `Update`, `Delete`. Located in `library/db/sql/`. Provides method chaining for building queries.

## R

### Redis
In-memory data store used for caching and session storage in production environments.

### redirect Plugin
Controller plugin for HTTP redirects. Supports redirecting to routes, URLs, or back to referer. Usage: `this.redirect().toRoute('admin-dashboard')`.

### Result Object
Authentication result wrapper (`library/authentication/result.js`) containing status code, identity data, and messages. Status codes: SUCCESS, FAILURE_IDENTITY_NOT_FOUND, FAILURE_CREDENTIAL_INVALID, FAILURE_UNCATEGORIZED.

### Revision
Historical snapshot of a post stored in `post_revisions` table. Tracks all changes with metadata about who made changes and when.

### Rollback Script
SQL script that reverses a migration. Located in `database/rollback/` with `-down.sql` suffix. Used to undo schema changes.

### Route
Mapping of URL pattern to controller action. Defined in `application/config/routes.config.js` with name, path, methods, and middleware.

### RouteMatch
Object representing a matched route with extracted parameters. Created by router during request processing.

## S

### Salted Hash
Security technique combining password with random salt before hashing. Format: `MD5(password|salt)`. Salt stored in `password_salt` column.

### Select Query Builder
Class for constructing SELECT queries with fluent interface. Supports columns, joins, where clauses, ordering, limits. Located in `library/db/sql/select.js`.

### Service
Business logic component that performs operations on entities and coordinates data access. Services extend `AbstractService` and are accessed via ServiceManager.

### ServiceManager
Dependency injection container that instantiates and manages services. Configured with application config and service factories.

### Session
Server-side storage for user data across requests. Configured for file-based (development) or Redis (production) storage.

### session Plugin
Controller plugin for accessing session data. Usage: `this.session().get('user')`, `this.session().set('key', 'value')`.

### Slug
URL-friendly string identifier derived from title. Used in URLs for posts, categories, and authors. Example: "breaking-news-update" from "Breaking News Update".

### Static Site Generation
Process of pre-rendering all dynamic content into static HTML files. Enables deployment to CDN/S3 without server-side rendering.

### style_id
Foreign key to `presentation_styles.id` in the `entity_presentation_styles` table. References the visual style assigned to an entity.

### Sponsorship
- **Sponsors Table**: Stores sponsor details (brand identity, links, default disclosure text).
- **Post Sponsorships**: Links posts to sponsors with sponsorship type, position, and schedule window.

### Feature Slotting
- **Post Features Table**: Manages feature slots for posts across different site areas.
  - Fields include `feature_area`, `featured_priority`, `featured_from`, and `featured_to`.
  - Uniqueness constraints ensure a post appears only once per `feature_area`.
  - `(feature_area, featured_priority)` combinations are unique when priority is set.

## T

### toObject()
Method on entities that serializes internal storage to a plain JavaScript object. Used before sending data to views or APIs.

### Transport
Output destination for logs. Common transports: console (stdout), file (disk). Configured in logger initialization.

### TTL (Time To Live)
Duration in seconds that cached data or session data remains valid before expiration.

## U

### url Plugin
Controller plugin for generating URLs from route names. Usage: `this.url().fromRoute('post-view', {slug: 'example'})`. Ensures consistent URL generation.

### UserService
Service handling user operations: authentication, user management, credential validation.

## V

### View
Presentation layer component (Nunjucks template) that renders HTML. Located in `view/application/` with module-specific subdirectories.

### View Helper
Function available in templates for common operations (URL generation, asset paths, flash messages). Registered in ViewHelperManager.

### ViewManager
Manages Nunjucks environment, registers filters and globals, handles template rendering and caching.

## W

### where() Method
Query builder method for adding WHERE clauses. Supports parameterized queries for SQL injection prevention. Example: `.where('id = ?', 5)`.

## Acronyms and Abbreviations

- **API** - Application Programming Interface
- **CDN** - Content Delivery Network
- **CRUD** - Create, Read, Update, Delete
- **CSRF** - Cross-Site Request Forgery
- **CSS** - Cascading Style Sheets
- **CMS** - Content Management System
- **DB** - Database
- **FK** - Foreign Key
- **HTML** - HyperText Markup Language
- **HTTP** - HyperText Transfer Protocol
- **ID** - Identifier
- **JS** - JavaScript
- **JSON** - JavaScript Object Notation
- **JWT** - JSON Web Token
- **MD5** - Message Digest Algorithm 5
- **MVC** - Model-View-Controller
- **ORM** - Object-Relational Mapping
- **PK** - Primary Key
- **S3** - Amazon Simple Storage Service
- **SEO** - Search Engine Optimization
- **SQL** - Structured Query Language
- **SSL** - Secure Sockets Layer
- **TTL** - Time To Live
- **URL** - Uniform Resource Locator
- **UUID** - Universally Unique Identifier
- **XSS** - Cross-Site Scripting

## File Extensions

- `.js` - JavaScript source file
- `.njk` - Nunjucks template file
- `.sql` - SQL script file
- `.md` - Markdown documentation file
- `.json` - JSON configuration or data file
- `.css` - Cascading Style Sheet file
- `.sh` - Shell script file

## Naming Conventions

### JavaScript Code
- **Controllers**: PascalCase + "Controller" suffix (e.g., `PostController`)
- **Services**: PascalCase + "Service" suffix (e.g., `PostService`)
- **Entities**: PascalCase + "Entity" suffix (e.g., `PostEntity`)
- **Actions**: camelCase + "Action" suffix (e.g., `indexAction`)
- **Variables**: camelCase (e.g., `postService`, `userName`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`)

### Database Schema
- **Tables**: snake_case, plural (e.g., `posts`, `post_revisions`)
- **Columns**: snake_case (e.g., `created_at`, `presentation_style_id`)
- **Foreign Keys**: `{table_singular}_{column}_fkey` (e.g., `posts_category_id_fkey`)
- **Indexes**: `{table}_{column}_idx` (e.g., `posts_slug_idx`)

### Routes
- **Route Names**: kebab-case with scope prefix (e.g., `admin-post-edit`, `blog-post-view`)
- **URL Paths**: kebab-case (e.g., `/admin/posts/edit`, `/posts/breaking-news`)

### Files and Directories
- **Directories**: kebab-case (e.g., `post-service`, `admin-controller`)
- **JavaScript Files**: kebab-case (e.g., `post-service.js`, `base-controller.js`)
- **Template Files**: kebab-case + `.njk` (e.g., `edit.njk`, `post-list.njk`)
- **Migration Files**: numbered + description (e.g., `001_init.sql`)
