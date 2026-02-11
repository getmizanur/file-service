# Technology Stack

## Overview

Daily Politics CMS is built on a modern JavaScript stack with Node.js and Express.js at its core. The architecture emphasizes modularity, testability, and deployment flexibility through static site generation.

## Runtime Environment

### Node.js
- **Version**: LTS 18+
- **Purpose**: Server-side JavaScript runtime
- **Why**: Mature ecosystem, non-blocking I/O, excellent performance for I/O-bound operations
- **Usage**: Powers the entire application backend

### Operating System
- **Development**: macOS, Linux, Windows
- **Production**: Linux (recommended)
- **Deployment**: Static files to S3/CloudFront (serverless)

## Core Framework

### Express.js 5.1.0
- **Purpose**: Web application framework
- **Why**: Lightweight, flexible, extensive middleware ecosystem
- **Usage**:
  - HTTP request/response handling
  - Middleware pipeline
  - Routing foundation
  - Session management
  - Static file serving

### Custom MVC Framework
- **Location**: `library/mvc/`
- **Purpose**: Structured application architecture
- **Components**:
  - Controllers with plugin system
  - Service layer with dependency injection
  - View management with Nunjucks
  - Router with named routes
  - ServiceManager for IoC container

## Database Layer

### PostgreSQL 8.16.3 (Primary)
- **Purpose**: Relational database management system
- **Why**:
  - ACID compliance
  - Advanced features (JSON, full-text search, CTEs)
  - Excellent performance and reliability
  - Rich ecosystem
- **Usage**:
  - Primary data store
  - Posts, revisions, categories, authors, users
  - Transactional operations
  - Complex queries with joins

### Database Adapters
Support for multiple database systems through abstraction layer:

#### pg (PostgreSQL) 8.16.3
- **Purpose**: PostgreSQL client for Node.js
- **Usage**: Primary database driver

#### mysql2 3.15.3
- **Purpose**: MySQL/MariaDB client
- **Usage**: Alternative database option

#### sqlite3 5.1.7
- **Purpose**: Embedded database
- **Usage**: Testing, development, embedded deployments

#### mssql 12.1.0
- **Purpose**: Microsoft SQL Server client
- **Usage**: Enterprise environments with SQL Server

### Database Architecture
- **Migration System**: Sequential SQL files with rollback scripts
- **Query Builder**: Custom SELECT/INSERT/UPDATE/DELETE builders
- **Connection Pooling**: Provided by database clients
- **Transactions**: Supported through adapter layer

## Template Engine

### Nunjucks 3.2.0
- **Purpose**: Server-side HTML templating
- **Why**:
  - Similar to Jinja2 (Python), Twig (PHP)
  - Powerful inheritance and composition
  - Auto-escaping for security
  - Custom filters and globals support
- **Usage**:
  - Admin interface rendering
  - Static site generation
  - Layout system
  - Email templates (future)

### nunjucks-date-filter 0.1.1
- **Purpose**: Date formatting in templates
- **Usage**: Human-readable date display

## Content Processing

### marked 17.0.1
- **Purpose**: Markdown to HTML converter
- **Why**:
  - Fast and lightweight
  - CommonMark compliant
  - Extensible with custom renderers
- **Usage**:
  - Post content rendering
  - Disclosure notes
  - Author biographies
  - Pre-rendering stored in database

## Session Management

### express-session 1.18.0
- **Purpose**: Session middleware for Express
- **Features**:
  - Cookie-based session IDs
  - Multiple store backends
  - Configurable security options
- **Configuration**:
  - httpOnly cookies
  - secure flag for HTTPS
  - sameSite for CSRF protection

### Session Stores

#### session-file-store 1.5.0
- **Purpose**: File-based session storage
- **Usage**: Development and simple deployments
- **Location**: `tmp/sessions/`

#### connect-redis 9.0.0
- **Purpose**: Redis session store adapter
- **Usage**: Production deployments
- **Benefits**: Fast, scalable, TTL-based expiration

### cookie-session 2.1.0
- **Purpose**: Cookie-only session storage
- **Usage**: Lightweight sessions without server-side storage

## Caching

### Redis 5.10.0 (Client)
- **Purpose**: In-memory data store
- **Usage**:
  - Session storage (production)
  - Cache storage (production)
  - Fast key-value operations
- **Features**:
  - Sub-millisecond latency
  - Persistence options
  - TTL support
  - Pub/Sub capabilities

### Cache Architecture
- **Frontends**: Core (with automatic serialization)
- **Backends**: File (dev), Redis (prod), Memcache (option)
- **Strategy**: Cache-aside pattern
- **TTL**: Configurable per-cache-type

## Security

### Helmet.js 8.1.0
- **Purpose**: Security headers middleware
- **Protection Against**:
  - XSS (Cross-Site Scripting)
  - Clickjacking
  - MIME type sniffing
  - Content injection
- **Headers Set**:
  - Content-Security-Policy
  - X-Frame-Options
  - X-Content-Type-Options
  - Strict-Transport-Security
  - X-XSS-Protection

### Custom Security Features
- **CSRF Protection**: Token-based validation
- **Password Hashing**: Salted MD5 (legacy, should migrate to bcrypt)
- **Session Security**: httpOnly, secure, sameSite cookies
- **SQL Injection Prevention**: Parameterized queries
- **Input Validation**: Server-side validation in controllers

## Performance

### compression 1.8.1
- **Purpose**: Response compression middleware
- **Algorithms**: gzip, deflate
- **Usage**: Compress HTML, CSS, JS responses
- **Benefits**: Reduced bandwidth, faster load times

### Static Site Generation
- **Purpose**: Pre-render dynamic content to static HTML
- **Benefits**:
  - No server-side rendering overhead
  - CDN-friendly
  - Infinite scalability
  - Lower hosting costs
- **Trade-off**: Build-time regeneration required

## Development Tools

### nodemon 3.0.0
- **Purpose**: Development server with auto-reload
- **Usage**: `npm run dev`
- **Watches**: `.js` files for changes
- **Benefits**: Faster development iteration

### cross-env 7.0.3
- **Purpose**: Cross-platform environment variables
- **Why**: Consistent environment variable setting across Windows, macOS, Linux
- **Usage**: Test scripts, CI/CD

## Testing

### Jest 29.0.0
- **Purpose**: JavaScript testing framework
- **Features**:
  - Unit testing
  - Integration testing
  - Code coverage reports
  - Snapshot testing
  - Mocking capabilities
- **Configuration**: Coverage reports to `build/reports/`

### supertest 6.3.0
- **Purpose**: HTTP assertion library
- **Usage**: Integration tests for API endpoints
- **Benefits**: High-level abstraction for HTTP testing

## Utilities

### dotenv 16.0.0
- **Purpose**: Environment variable management
- **Usage**: Load `.env` file into `process.env`
- **Benefits**: Separate config from code, 12-factor app compliance

### uuid 9.0.0
- **Purpose**: UUID generation
- **Usage**:
  - Unique identifiers
  - CSRF tokens
  - Session IDs
- **Version**: v4 (random)

### node-fetch 2.7.0
- **Purpose**: HTTP client (Fetch API for Node.js)
- **Usage**:
  - External API calls
  - Web scraping
  - Service-to-service communication

## Build and Deployment

### Custom Build System
- **Script**: `scripts/build-script.js`
- **Purpose**: Static site generation
- **Process**:
  1. Fetch all published posts from database
  2. Render Nunjucks templates with data
  3. Generate HTML files
  4. Output to `static-site/` directory
- **Command**: `npm run build`

### Static Site Server
- **Script**: `scripts/serve-static.js`
- **Purpose**: Preview static site locally
- **Features**: Simple HTTP server for `static-site/` directory
- **Command**: `npm run serve-static`

### Deployment Scripts

#### sync-to-s3.sh
- **Purpose**: Deploy static site to Amazon S3
- **Features**:
  - Sync files to S3 bucket
  - Delete removed files
  - Set cache headers
  - CloudFront invalidation
- **Commands**:
  - `npm run deploy` - Deploy to S3
  - `npm run deploy:dry-run` - Preview changes
  - `npm run deploy:full` - Build and deploy

## Cloud Services

### Amazon Web Services (AWS)

#### Amazon S3
- **Purpose**: Static file hosting
- **Usage**: Host generated static site
- **Benefits**: Durable, scalable, cost-effective

#### Amazon CloudFront (CDN)
- **Purpose**: Content delivery network
- **Usage**: Global distribution of static site
- **Benefits**: Low latency, high transfer speeds, HTTPS

## Browser Compatibility

### Target Browsers
- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES2015+ JavaScript support
- No IE11 support required

### Frontend Technologies
- **CSS**: Custom styles with GOV.UK Design System patterns
- **JavaScript**: Vanilla JS for admin interface
- **No Build Step**: Direct ES6+ usage (no transpilation)

## API and Data Formats

### JSON
- **Purpose**: Configuration files, API responses
- **Usage**:
  - `package.json` - Dependencies
  - Configuration files
  - Data interchange

### Markdown
- **Purpose**: Content authoring format
- **Usage**: Post content, author bios, disclosure notes
- **Storage**: Both markdown source and pre-rendered HTML

## Development Dependencies Summary

```json
{
  "cross-env": "^7.0.3",    // Cross-platform env vars
  "jest": "^29.0.0",         // Testing framework
  "nodemon": "^3.0.0",       // Dev server
  "supertest": "^6.3.0"      // HTTP testing
}
```

## Production Dependencies Summary

```json
{
  "compression": "^1.8.1",           // Response compression
  "connect-redis": "^9.0.0",         // Redis session store
  "cookie-session": "^2.1.0",        // Cookie sessions
  "dotenv": "^16.0.0",               // Environment config
  "express": "^5.1.0",               // Web framework
  "express-session": "^1.18.0",      // Session middleware
  "helmet": "^8.1.0",                // Security headers
  "marked": "^17.0.1",               // Markdown parser
  "mssql": "^12.1.0",                // SQL Server client
  "mysql2": "^3.15.3",               // MySQL client
  "node-fetch": "^2.7.0",            // HTTP client
  "nunjucks": "^3.2.0",              // Template engine
  "nunjucks-date-filter": "^0.1.1",  // Date formatting
  "pg": "^8.16.3",                   // PostgreSQL client
  "redis": "^5.10.0",                // Redis client
  "session-file-store": "^1.5.0",    // File session store
  "sqlite3": "^5.1.7",               // SQLite client
  "uuid": "^9.0.0"                   // UUID generation
}
```

## Architecture Patterns

### Design Patterns Used
- **MVC (Model-View-Controller)**: Application structure
- **Adapter Pattern**: Database, authentication, cache, session abstractions
- **Factory Pattern**: Service instantiation
- **Dependency Injection**: ServiceManager for service dependencies
- **Repository Pattern**: Service layer for data access
- **Plugin Pattern**: Controller plugins for reusable functionality
- **Template Method**: BaseController and AbstractService
- **Builder Pattern**: Query builders (Select, Insert, Update, Delete)

## System Requirements

### Minimum Requirements
- **CPU**: 1 core (2+ recommended)
- **RAM**: 512MB (1GB+ recommended)
- **Storage**: 100MB for application, additional for database
- **Node.js**: Version 18.x LTS or higher
- **Database**: PostgreSQL 12+ (or alternatives)

### Recommended Production Setup
- **CPU**: 2+ cores
- **RAM**: 2GB+
- **Storage**: SSD for database
- **Node.js**: Latest LTS version
- **Database**: PostgreSQL 14+ with connection pooling
- **Cache**: Redis 6+ for sessions and caching
- **CDN**: CloudFront for static site distribution

## Technology Selection Rationale

### Why Express.js?
- Minimal, unopinionated framework
- Extensive middleware ecosystem
- Well-documented and mature
- Large community support
- Easy to extend with custom MVC layer

### Why PostgreSQL?
- Open source with permissive license
- Advanced SQL features
- Excellent JSON support
- Strong consistency guarantees
- Active development and community

### Why Nunjucks?
- Similar syntax to Jinja2/Twig (familiar to many developers)
- Powerful template inheritance
- Auto-escaping by default (security)
- Synchronous rendering (required for static generation)
- Good performance

### Why Static Site Generation?
- Eliminates server-side rendering overhead
- Infinite horizontal scalability
- Simple deployment (just files)
- Cost-effective (S3 + CloudFront cheaper than servers)
- Excellent performance (pre-rendered)
- Security (no server to attack)

### Why Custom MVC Framework?
- Full control over architecture
- No framework lock-in
- Optimized for specific use case
- Learning opportunity
- Lightweight (only what's needed)

## Future Technology Considerations

### Potential Additions
- **TypeScript**: Type safety and better IDE support
- **GraphQL**: More flexible API layer
- **bcrypt**: Replace MD5 password hashing
- **Vite/Webpack**: Frontend build pipeline
- **Tailwind CSS**: Utility-first CSS framework
- **Docker**: Containerization for deployment
- **PM2**: Process management in production
- **Nginx**: Reverse proxy and load balancing
- **PostgreSQL Full-Text Search**: Better search capabilities
- **Elasticsearch**: Advanced search and analytics

### Potential Migrations
- **Serverless Functions**: AWS Lambda for dynamic features
- **Next.js**: Hybrid static/dynamic rendering
- **Prisma ORM**: Type-safe database access
- **React/Vue**: Rich admin interface
- **GitHub Actions**: CI/CD automation

## Version History

### Current Stack (v1.0.0)
- Node.js 18+
- Express.js 5.1.0
- PostgreSQL 8.16.3 (pg client)
- Nunjucks 3.2.0
- Redis 5.10.0
- Jest 29.0.0

### Upgrade Path
- Regular updates to patch versions
- Security updates prioritized
- Major version upgrades tested in staging
- Database migrations handled separately

## License Information

All dependencies are open source with permissive licenses (MIT, Apache, BSD). No proprietary software required.
