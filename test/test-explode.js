const path = require('path');
global.applicationPath = (p) => path.join(__dirname, p);

const ExplodeHelper = require('./application/helper/explode-helper');
const helper = new ExplodeHelper();

console.log("Test 1: Simple comma:", JSON.stringify(helper.render(',', 'one,two,three')));
console.log("Test 2: Space:", JSON.stringify(helper.render(' ', 'one two three')));
console.log("Test 3: Empty string:", JSON.stringify(helper.render(',', '')));
console.log("Test 4: Limit positive (2):", JSON.stringify(helper.render(',', 'one,two,three,four', 2)));
console.log("Test 5: Limit negative (-1):", JSON.stringify(helper.render(',', 'one,two,three,four', -1)));
console.log("Test 6: Empty separator:", JSON.stringify(helper.render('', 'test')));
