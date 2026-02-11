// Example usage of instanceof to identify helper classes
const AbstractHelper = require('./library/mvc/view/helper/abstract-helper');
const SidebarHelper = require('./application/view/helper/sidebarHelper');
const HeadTitle = require('./library/mvc/view/helper/head-title');
const FormText = require('./library/mvc/view/helper/form-text');

// Create instances
const sidebar = new SidebarHelper();
const headTitle = new HeadTitle();
const formText = new FormText();
const notHelper = {};

// Test instanceof checks
console.log('=== Helper Class Detection ===');
console.log('sidebar instanceof AbstractHelper:', sidebar instanceof AbstractHelper);
console.log('headTitle instanceof AbstractHelper:', headTitle instanceof AbstractHelper);
console.log('formText instanceof AbstractHelper:', formText instanceof AbstractHelper);
console.log('notHelper instanceof AbstractHelper:', notHelper instanceof AbstractHelper);

// Function to check if object is a helper
function isHelper(obj) {
    return obj instanceof AbstractHelper;
}

console.log('\n=== Using isHelper() function ===');
console.log('isHelper(sidebar):', isHelper(sidebar));
console.log('isHelper(headTitle):', isHelper(headTitle));
console.log('isHelper(formText):', isHelper(formText));
console.log('isHelper(notHelper):', isHelper(notHelper));

// Test that render method is enforced
console.log('\n=== Testing render() method enforcement ===');
try {
    const abstractHelper = new AbstractHelper();
    abstractHelper.render(); // Should throw error
} catch (error) {
    console.log('AbstractHelper.render() correctly throws error:', error.message);
}

// Test actual render methods work
console.log('\n=== Testing actual render methods ===');
console.log('sidebar.render() works:', typeof sidebar.render() === 'string');
console.log('headTitle.render() works:', typeof headTitle.render() === 'string');

// Note: formText.render() needs an element object, so we'll skip that test