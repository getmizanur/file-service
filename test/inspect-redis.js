// Inspect Redis database
const redis = require('redis');

async function inspectRedis() {
    const client = redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        db: process.env.REDIS_DB || 0
    });

    try {
        await client.connect();
        console.log('Connected to Redis');

        // Get all keys
        const keys = await client.keys('sess:*');
        console.log(`\nFound ${keys.length} session(s) in Redis:`);
        console.log('Keys:', keys);

        // Inspect each session
        for (const key of keys) {
            console.log(`\n========================================`);
            console.log(`Session Key: ${key}`);
            const sessionData = await client.get(key);
            console.log('Raw Data:', sessionData);

            if (sessionData) {
                try {
                    const parsed = JSON.parse(sessionData);
                    console.log('Parsed Session:', JSON.stringify(parsed, null, 2));
                } catch (e) {
                    console.log('Could not parse session data');
                }
            }
            console.log(`========================================`);
        }

        await client.quit();
        console.log('\nDisconnected from Redis');
    } catch (error) {
        console.error('Error inspecting Redis:', error);
        process.exit(1);
    }
}

inspectRedis();
