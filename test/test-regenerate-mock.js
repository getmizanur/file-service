const session = require('express-session');
const FileStore = require('session-file-store')(session);

// Mock request
const req = {
    sessionID: 'old-id',
    session: {
        id: 'old-id',
        cookie: {},
        customData: { foo: 'bar' },
        regenerate: function (cb) {
            console.log('Mock regenerate called');
            // Simulate express-session regenerate: create new session, keep data?
            // Standard express-session behavior is to start EMPTY.
            // But let's verify what happens if we don't clear it.
            this.id = 'new-id';
            // In real express-session, this object is REPLACED.
            // But here we are mocking.
            cb(null);
        }
    }
};

console.log('This script is a mock. I need to run a real express app to test express-session behavior.');
