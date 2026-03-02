# Authentication Library

A Zend Framework-inspired authentication system for Node.js applications, providing secure user authentication with session-based storage and database adapters.

## Architecture

The authentication system follows the Zend Framework authentication pattern with three main components:

### 1. **Result** (`result.js`)
Encapsulates the authentication result with status codes, identity data, and messages.

**Result Codes:**
- `Result.SUCCESS` (1) - Authentication successful
- `Result.FAILURE` (0) - General failure
- `Result.FAILURE_IDENTITY_NOT_FOUND` (-1) - Identity not found
- `Result.FAILURE_IDENTITY_AMBIGUOUS` (-2) - Identity is ambiguous
- `Result.FAILURE_CREDENTIAL_INVALID` (-3) - Invalid credentials
- `Result.FAILURE_UNCATEGORIZED` (-4) - Uncategorized failure

**Example:**
```javascript
const Result = require('./library/authentication/result');

const result = new Result(
    Result.SUCCESS,
    { id: 1, username: 'john', email: 'john@example.com' },
    ['Authentication successful']
);

if (result.isValid()) {
    const identity = result.getIdentity();
    console.log('Logged in as:', identity.username);
}
```

### 2. **Storage** (`storage/session.js`)
Manages persistent storage of authentication identity. The session storage implementation stores identity in the user's session.

**Key Methods:**
- `isEmpty()` - Check if storage is empty
- `read()` - Retrieve identity from storage
- `write(contents)` - Store identity
- `clear()` - Remove identity from storage

**Example:**
```javascript
const SessionStorage = require('./library/authentication/storage/session');

const storage = new SessionStorage(req.session);

// Store identity
storage.write({ id: 1, username: 'john' });

// Check if authenticated
if (!storage.isEmpty()) {
    const identity = storage.read();
    console.log('Current user:', identity.username);
}

// Logout
storage.clear();
```

### 3. **Authentication Service** (`authentication-service.js`)
Main service that coordinates authentication using adapters and storage.

**Key Methods:**
- `setAdapter(adapter)` - Set authentication adapter
- `authenticate(adapter)` - Perform authentication
- `hasIdentity()` - Check if user is authenticated
- `getIdentity()` - Retrieve current user identity
- `clearIdentity()` - Logout current user

**Example:**
```javascript
const AuthenticationService = require('./library/authentication/authentication-service');
const SessionStorage = require('./library/authentication/storage/session');
const DbAdapter = require('./library/authentication/adapter/db-adapter');

// Initialize service with session storage
const authService = new AuthenticationService(
    new SessionStorage(req.session)
);

// Set up database adapter
const db = serviceManager.get('Database');
const adapter = new DbAdapter(db, 'users', 'email', 'password_hash', 'password_salt');
adapter.setUsername('john@example.com');
adapter.setPassword('secret123');

// Authenticate
authService.setAdapter(adapter);
const result = await authService.authenticate();

if (result.isValid()) {
    console.log('Login successful');
    const identity = authService.getIdentity();
} else {
    console.log('Login failed:', result.getMessages());
}
```

### 4. **Database Adapter** (`adapter/db-adapter.js`)
Authenticates credentials against a database using salted MD5 password hashing.

**Password Hashing:**
The adapter uses MD5 with salt: `MD5(password|salt)`

**Constructor Parameters:**
- `db` - Database connection (Knex instance)
- `tableName` - Users table name (default: 'users')
- `identityColumn` - Username/email column (default: 'username')
- `credentialColumn` - Password hash column (default: 'password_hash')
- `saltColumn` - Password salt column (default: 'password_salt')

**Database Requirements:**
The users table must have:
- Identity column (username or email)
- Password hash column (MD5 hash)
- Password salt column (random salt)
- Active status column (boolean, default: 'active')

**Example:**
```javascript
const DbAdapter = require('./library/authentication/adapter/dbAdapter');
const crypto = require('crypto');

// Creating a user with salted password
const salt = crypto.randomBytes(16).toString('hex');
const password = 'mypassword';
const hash = crypto.createHash('md5').update(`${password}|${salt}`).digest('hex');

await db('users').insert({
    email: 'john@example.com',
    password_hash: hash,
    password_salt: salt,
    active: true
});

// Authenticating
const adapter = new DbAdapter(db, 'users', 'email', 'password_hash', 'password_salt');
adapter.setUsername('john@example.com');
adapter.setPassword('mypassword');

const result = await adapter.authenticate();
```

## Usage in Controllers

### Login Flow

```javascript
const AuthenticationService = require(global.applicationPath('/library/authentication/authenticationService'));
const SessionStorage = require(global.applicationPath('/library/authentication/storage/session'));
const DbAdapter = require(global.applicationPath('/library/authentication/adapter/dbAdapter'));

async indexAction() {
    // Initialize authentication service
    const session = this.getRequest().getSession();
    const authService = new AuthenticationService(new SessionStorage(session));

    // Redirect if already authenticated
    if (authService.hasIdentity()) {
        return this.plugin('redirect').toRoute('adminIndexDashboard');
    }

    // Handle form submission
    if (this.getRequest().isPost()) {
        const postData = this.getRequest().getPost();

        // Validate form...

        if (form.isValid()) {
            const values = form.getData();

            // Set up authentication adapter
            const db = this.getServiceManager().get('Database');
            const adapter = new DbAdapter(db, 'users', 'email', 'password_hash', 'password_salt');
            adapter.setUsername(values.username);
            adapter.setPassword(values.password);

            // Authenticate
            authService.setAdapter(adapter);
            const result = await authService.authenticate();

            if (result.isValid()) {
                // Success - redirect to dashboard
                this.plugin('flashMessenger').addSuccessMessage('Login successful');
                return this.plugin('redirect').toRoute('adminIndexDashboard');
            } else {
                // Failed - show error
                this.plugin('flashMessenger').addErrorMessage('Authentication unsuccessful');
            }
        }
    }

    return this.getView().setVariable('form', form);
}
```

### Protected Actions

```javascript
async dashboardAction() {
    // Check authentication
    const session = this.getRequest().getSession();
    const authService = new AuthenticationService(new SessionStorage(session));

    if (!authService.hasIdentity()) {
        this.plugin('flashMessenger').addErrorMessage('You must be logged in');
        return this.plugin('redirect').toRoute('adminIndexIndex');
    }

    // Get current user identity
    const identity = authService.getIdentity();
    console.log('Current user:', identity.email);

    // Render dashboard
    return this.getView();
}
```

### Logout

```javascript
logoutAction() {
    // Initialize authentication service
    const session = this.getRequest().getSession();
    const authService = new AuthenticationService(new SessionStorage(session));

    // Clear identity
    authService.clearIdentity();

    // Add success message and redirect
    this.plugin('flashMessenger').addSuccessMessage('Logged out successfully');
    return this.plugin('redirect').toRoute('adminIndexIndex');
}
```

## Security Features

### 1. **CSRF Protection**
All login forms must include CSRF token validation:

```javascript
const inputFilter = InputFilter.factory({
    'csrf': {
        required: true,
        validators: [
            {
                name: 'StringLength',
                options: {
                    min: 64,
                    max: 64,
                    messageTemplate: {
                        INVALID_TOO_SHORT: 'Invalid CSRF token',
                        INVALID_TOO_LONG: 'Invalid CSRF token'
                    }
                }
            }
        ]
    }
});
```

### 2. **Salted Password Hashing**
Passwords are hashed using MD5 with unique salts:
```
hash = MD5(password|salt)
```

**Note:** For new applications, consider using bcrypt or argon2 instead of MD5.

### 3. **Active User Validation**
Only users with `active = true` can authenticate.

### 4. **Generic Error Messages**
Authentication failures return generic messages to prevent username enumeration:
```javascript
['Authentication unsuccessful']
```

### 5. **Sensitive Data Removal**
Password hashes and salts are removed from the identity before storage:
```javascript
delete identity.password_hash;
delete identity.password_salt;
```

## Database Schema

### Example Users Table (PostgreSQL)

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(32) NOT NULL,
    password_salt VARCHAR(32) NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(active);
```

### Creating Users

```javascript
const crypto = require('crypto');

function createUser(email, password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.createHash('md5').update(`${password}|${salt}`).digest('hex');

    return db('users').insert({
        email: email,
        password_hash: hash,
        password_salt: salt,
        active: true
    });
}

// Example
await createUser('admin@example.com', 'secure_password_123');
```

## Service Registration

The `Database` service is registered as a framework service in ServiceManager:

```javascript
// library/service/service-manager.js
this.frameworkFactories = {
    "ViewManager": "/library/service/factory/view-manager-factory",
    "ViewHelperManager": "/library/service/factory/view-helper-manager-factory",
    "PluginManager": "/library/service/factory/plugin-manager-factory",
    "Database": "/library/service/factory/databaseFactory"
};
```

Access the database service in controllers:
```javascript
const db = this.getServiceManager().get('Database');
```

## Error Handling

The authentication system provides detailed error handling:

```javascript
try {
    const result = await authService.authenticate();

    if (result.isValid()) {
        // Success
    } else {
        // Get error code and messages
        const code = result.getCode();
        const messages = result.getMessages();

        switch (code) {
            case Result.FAILURE_IDENTITY_NOT_FOUND:
                console.log('User not found');
                break;
            case Result.FAILURE_CREDENTIAL_INVALID:
                console.log('Invalid password');
                break;
            default:
                console.log('Authentication failed');
        }
    }
} catch (error) {
    console.error('Authentication error:', error);
}
```

## Testing

### Creating Test Users

```javascript
// Create test user for development
const crypto = require('crypto');
const db = require('./path/to/database');

async function createTestUser() {
    const salt = crypto.randomBytes(16).toString('hex');
    const password = 'testpass123';
    const hash = crypto.createHash('md5').update(`${password}|${salt}`).digest('hex');

    await db('users').insert({
        email: 'test@example.com',
        password_hash: hash,
        password_salt: salt,
        active: true
    });

    console.log('Test user created:');
    console.log('Email: test@example.com');
    console.log('Password: testpass123');
}

createTestUser();
```

## Migration from PHP Zend Framework

This implementation maintains compatibility with Zend Framework authentication:

1. **Same password hashing** - MD5 with salt format `MD5(password|salt)`
2. **Same Result codes** - Identical failure/success constants
3. **Same API** - Methods like `authenticate()`, `hasIdentity()`, `getIdentity()`, `clearIdentity()`
4. **Same storage pattern** - Session-based storage with same interface

Users and passwords from a PHP Zend Framework application will work seamlessly with this Node.js implementation.

## Extending the System

### Custom Adapters

Create custom authentication adapters by implementing the authenticate method:

```javascript
class LdapAdapter {
    async authenticate() {
        // LDAP authentication logic

        if (authenticated) {
            return new Result(Result.SUCCESS, identity, ['Success']);
        } else {
            return new Result(Result.FAILURE, null, ['Failed']);
        }
    }
}
```

### Custom Storage

Implement custom storage backends:

```javascript
class RedisStorage {
    isEmpty() { /* ... */ }
    read() { /* ... */ }
    write(contents) { /* ... */ }
    clear() { /* ... */ }
}
```

## Best Practices

1. **Always use HTTPS** in production to protect credentials in transit
2. **Regenerate session IDs** after successful login to prevent session fixation
3. **Implement rate limiting** to prevent brute force attacks
4. **Log authentication attempts** for security auditing
5. **Use strong password policies** (minimum length, complexity requirements)
6. **Consider upgrading to bcrypt** for new applications instead of MD5
7. **Implement account lockout** after multiple failed attempts
8. **Add two-factor authentication** for sensitive operations

## Files

```
library/authentication/
├── README.md                           # This file
├── result.js                           # Authentication result
├── authentication-service.js           # Main authentication service
├── adapter/
│   └── db-adapter.js                   # Database authentication adapter
└── storage/
    └── session.js                      # Session-based storage

library/service/factory/
└── databaseFactory.js                  # Database service factory
```
