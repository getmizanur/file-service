# SessionContainer - User Session Storage

The SessionContainer class provides a clean interface to store and retrieve user-specific session data.

## Usage

```javascript
const SessionContainer = require('./library/session/session-container');
const session = new SessionContainer('AuthIdentity');

// Store values
session.set('user_id', 123);

// Retrieve values
const userId = session.get('user_id');
```

## Methods

- `set(key, value)`: Store a value in the session namespace.
- `get(key, defaultValue)`: Retrieve a value. Returns `defaultValue` if not found.
- `has(key)`: Check if a key exists.
- `remove(key)`: Remove a key.
- `clear()`: Clear all data in the namespace.
