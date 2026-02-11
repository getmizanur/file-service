try {
    require('connect-redis');
    console.log('connect-redis is available');
} catch (e) {
    console.log('connect-redis is MISSING');
}

try {
    require('redis');
    console.log('redis client is available');
} catch (e) {
    console.log('redis client is MISSING');
}
