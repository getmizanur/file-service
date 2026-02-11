const SessionContainer = require('./library/session/session-container');
const SessionStorage = require('./library/authentication/storage/session-storage');
const AuthenticationService = require('./library/authentication/authentication-service');

// Mock express-session
const mockSession = {
    id: 'test-session-id',
    cookie: {},
    regenerate: (cb) => cb(null),
    save: (cb) => cb(null),
    destroy: (cb) => cb(null)
};

console.log('--- Starting Auth Test ---');

// 1. Simulate Login
console.log('1. Simulating Login...');
const storage = new SessionStorage(mockSession);
const authService = new AuthenticationService(storage);

// Mock identity
const identity = { id: 1, username: 'admin' };

console.log('Initial hasIdentity:', authService.hasIdentity()); // Should be false

// Write identity
console.log('Writing identity:', identity);
authService.getStorage().write(identity);

console.log('Post-write hasIdentity:', authService.hasIdentity()); // Should be true
console.log('Retrieved identity:', authService.getIdentity());

console.log('Session customData:', JSON.stringify(mockSession.customData, null, 2));

// 2. Simulate Next Request (New Service Instance, Same Session)
console.log('\n2. Simulating Next Request...');
const storage2 = new SessionStorage(mockSession);
const authService2 = new AuthenticationService(storage2);

console.log('Next request hasIdentity:', authService2.hasIdentity()); // Should be true
console.log('Next request identity:', authService2.getIdentity());

if (authService2.hasIdentity() && authService2.getIdentity().username === 'admin') {
    console.log('\nSUCCESS: Authentication logic is working correctly.');
} else {
    console.log('\nFAILURE: Authentication logic failed.');
}
