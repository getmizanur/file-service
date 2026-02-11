const Session = require('./library/session/session');

// Mock request and session
const mockSession = {
    id: 'old-id',
    regenerate: (cb) => {
        console.log('Mock session.regenerate called');
        cb(null);
    }
};
const mockReq = {
    session: mockSession,
    sessionID: 'old-id'
};

async function testRegenerate() {
    console.log('--- Testing Session.regenerate ---');

    // 1. Test without start (Should fail)
    console.log('\n1. Testing without Session.start()...');
    try {
        await Session.regenerate();
        console.log('FAILURE: Should have thrown error');
    } catch (e) {
        console.log('SUCCESS: Caught expected error:', e.message);
    }

    // 2. Test with start (Should succeed, but static state is dangerous)
    console.log('\n2. Testing with Session.start()...');
    Session.start(mockReq);
    try {
        await Session.regenerate();
        console.log('SUCCESS: Regenerated with static state');
    } catch (e) {
        console.log('FAILURE:', e.message);
    }
}

testRegenerate();
