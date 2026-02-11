const express = require('express');
const session = require('express-session');
const http = require('http');

const app = express();
app.use(session({
    secret: 'test',
    resave: false,
    saveUninitialized: true
}));

app.get('/login', (req, res) => {
    req.session.user = 'admin';
    req.session.customData = { foo: 'bar' };
    res.send('Logged in');
});

app.get('/logout', (req, res) => {
    const oldId = req.session.id;
    req.session.regenerate((err) => {
        if (err) return res.status(500).send(err.message);

        // Check if data persists
        const user = req.session.user;
        const customData = req.session.customData;

        res.json({
            oldId,
            newId: req.session.id,
            user: user || null, // Should be null if cleared
            customData: customData || null // Should be null if cleared
        });
    });
});

const server = app.listen(3000, async () => {
    console.log('Server started on 3000');

    // Run client test
    try {
        const fetch = (await import('node-fetch')).default;

        // 1. Login
        console.log('1. Logging in...');
        let res = await fetch('http://localhost:3000/login');
        const cookie = res.headers.get('set-cookie');
        console.log('Cookie:', cookie);

        // 2. Logout (Regenerate)
        console.log('\n2. Logging out (Regenerate)...');
        res = await fetch('http://localhost:3000/logout', {
            headers: { cookie }
        });
        const data = await res.json();
        console.log('Logout Result:', data);

        if (!data.user && !data.customData) {
            console.log('\nSUCCESS: Session data was cleared on regenerate.');
        } else {
            console.log('\nFAILURE: Session data persisted!');
        }

        server.close();
    } catch (e) {
        console.error(e);
        server.close();
    }
});
