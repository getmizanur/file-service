// Clear Redis database
const redis = require('redis');

async function clearRedis() {
    const client = redis.createClient({
        host: process.env.REDIS_HOST || 'locahost',
        port: process.env.REDIS_PORT || 6379,
        db: process.env.REDIS_DB || 0
    });

    try {
        await client.connect();
        console.log('Connected to Redis');

        // Clear all keys in current database
        await client.flushDb();
        console.log('Redis database cleared successfully');

        await client.quit();
        console.log('Disconnected from Redis');
    } catch (error) {
        console.error('Error clearing Redis:', error);
        process.exit(1);
    }
}

clearRedis();
