try {
    require('connect-redis');
    console.log('connect-redis is available');
} catch {
    // Intentionally ignored - checking if connect-redis module is installed
    console.log('connect-redis is MISSING');
}

try {
    require('redis');
    console.log('redis client is available');
} catch {
    // Intentionally ignored - checking if redis module is installed
    console.log('redis client is MISSING');
}
