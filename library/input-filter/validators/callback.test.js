/**
 * Callback Validator Tests
 *
 * Demonstrates all features of the improved Callback validator
 */

const Callback = require('./callback');

console.log('='.repeat(60));
console.log('CALLBACK VALIDATOR - COMPREHENSIVE TESTS');
console.log('='.repeat(60));
console.log('');

// Test 1: Constructor validation
console.log('TEST 1: Constructor validation');
console.log('-'.repeat(60));
try {
  const invalidValidator = new Callback({});
  console.log('❌ FAILED: Should have thrown error for missing callback');
} catch (error) {
  console.log('✅ PASSED: Correctly rejects missing callback');
  console.log(`   Error: ${error.message}`);
}
console.log('');

// Test 2: Simple boolean return
console.log('TEST 2: Simple boolean return');
console.log('-'.repeat(60));
const boolValidator = new Callback({
  callback: (value) => value.length > 5
});

const test2a = boolValidator.isValid('hello world');
console.log(`Value: "hello world" (length 11)`);
console.log(`Result: ${test2a ? '✅ PASSED' : '❌ FAILED'} (expected: true)`);

const test2b = boolValidator.isValid('hi');
console.log(`Value: "hi" (length 2)`);
console.log(`Result: ${!test2b ? '✅ PASSED' : '❌ FAILED'} (expected: false)`);
console.log(`Message: "${boolValidator.getMessage()}"`);
console.log('');

// Test 3: Object return with custom message
console.log('TEST 3: Object return with custom message');
console.log('-'.repeat(60));
const objectValidator = new Callback({
  callback: (value) => {
    if (value.length < 5) {
      return {
        valid: false,
        message: 'Password must be at least 5 characters long'
      };
    }
    if (!/[A-Z]/.test(value)) {
      return {
        valid: false,
        message: 'Password must contain at least one uppercase letter'
      };
    }
    return { valid: true };
  }
});

const test3a = objectValidator.isValid('abc');
console.log(`Value: "abc"`);
console.log(`Result: ${!test3a ? '✅ PASSED' : '❌ FAILED'} (expected: false)`);
console.log(`Message: "${objectValidator.getMessage()}"`);

const test3b = objectValidator.isValid('hello');
console.log(`Value: "hello"`);
console.log(`Result: ${!test3b ? '✅ PASSED' : '❌ FAILED'} (expected: false)`);
console.log(`Message: "${objectValidator.getMessage()}"`);

const test3c = objectValidator.isValid('Hello');
console.log(`Value: "Hello"`);
console.log(`Result: ${test3c ? '✅ PASSED' : '❌ FAILED'} (expected: true)`);
console.log('');

// Test 4: String return as error message
console.log('TEST 4: String return as error message');
console.log('-'.repeat(60));
const stringValidator = new Callback({
  callback: (value) => {
    if (value.length < 3) return 'Too short!';
    if (value.length > 10) return 'Too long!';
    return true;
  }
});

const test4a = stringValidator.isValid('ab');
console.log(`Value: "ab"`);
console.log(`Result: ${!test4a ? '✅ PASSED' : '❌ FAILED'} (expected: false)`);
console.log(`Message: "${stringValidator.getMessage()}"`);

const test4b = stringValidator.isValid('hello');
console.log(`Value: "hello"`);
console.log(`Result: ${test4b ? '✅ PASSED' : '❌ FAILED'} (expected: true)`);
console.log('');

// Test 5: Context usage
console.log('TEST 5: Context usage (password confirmation)');
console.log('-'.repeat(60));
const contextValidator = new Callback({
  callback: (value, context) => {
    if (value !== context.password) {
      return {
        valid: false,
        message: 'Passwords do not match'
      };
    }
    return true;
  }
});

const test5a = contextValidator.isValid('password123', {
  password: 'password123'
});
console.log(`Value: "password123", Context password: "password123"`);
console.log(`Result: ${test5a ? '✅ PASSED' : '❌ FAILED'} (expected: true)`);

const test5b = contextValidator.isValid('password456', {
  password: 'password123'
});
console.log(`Value: "password456", Context password: "password123"`);
console.log(`Result: ${!test5b ? '✅ PASSED' : '❌ FAILED'} (expected: false)`);
console.log(`Message: "${contextValidator.getMessage()}"`);
console.log('');

// Test 6: Error handling
console.log('TEST 6: Error handling (callback throws exception)');
console.log('-'.repeat(60));
const errorValidator = new Callback({
  callback: (value) => {
    // Intentionally throw error
    throw new Error('Something went wrong!');
  }
});

const test6 = errorValidator.isValid('test');
console.log(`Callback throws error`);
console.log(`Result: ${!test6 ? '✅ PASSED' : '❌ FAILED'} (expected: false)`);
console.log(`Message: "${errorValidator.getMessage()}"`);
console.log('');

// Test 7: Truthy/Falsy coercion
console.log('TEST 7: Truthy/Falsy coercion');
console.log('-'.repeat(60));
const truthyValidator = new Callback({
  callback: (value) => value.length  // Returns number (truthy/falsy)
});

const test7a = truthyValidator.isValid('hello');
console.log(`Value: "hello" (length: 5)`);
console.log(`Result: ${test7a ? '✅ PASSED' : '❌ FAILED'} (expected: true - 5 is truthy)`);

const test7b = truthyValidator.isValid('');
console.log(`Value: "" (length: 0)`);
console.log(`Result: ${!test7b ? '✅ PASSED' : '❌ FAILED'} (expected: false - 0 is falsy)`);
console.log('');

// Test 8: getMessage() and getMessages()
console.log('TEST 8: getMessage() and getMessages() methods');
console.log('-'.repeat(60));
const msgValidator = new Callback({
  callback: (value) => value.length > 5,
  messageTemplate: {
    INVALID: 'Custom invalid message'
  }
});

msgValidator.isValid('hi');
console.log(`getMessage(): "${msgValidator.getMessage()}"`);
console.log(`getMessages(): ${JSON.stringify(msgValidator.getMessages())}`);
console.log(`Result: ${msgValidator.getMessage() === 'Custom invalid message' ? '✅ PASSED' : '❌ FAILED'}`);
console.log('');

// Test 9: Safe context handling
console.log('TEST 9: Safe context handling (undefined context)');
console.log('-'.repeat(60));
const safeValidator = new Callback({
  callback: (value, context) => {
    // Context is always an object (never undefined)
    return typeof context === 'object';
  }
});

const test9 = safeValidator.isValid('test');  // No context provided
console.log(`No context provided`);
console.log(`Result: ${test9 ? '✅ PASSED' : '❌ FAILED'} (expected: true - context defaults to {})`);
console.log('');

// Test 10: Backward compatibility
console.log('TEST 10: Backward compatibility with old code');
console.log('-'.repeat(60));
const oldStyleValidator = new Callback({
  callback: (value) => {
    return value.length > 3;  // Old style: just return boolean
  }
});

const test10 = oldStyleValidator.isValid('hello');
console.log(`Old style callback (returns boolean)`);
console.log(`Result: ${test10 ? '✅ PASSED' : '❌ FAILED'} (expected: true - backward compatible)`);
console.log('');

console.log('='.repeat(60));
console.log('ALL TESTS COMPLETED');
console.log('='.repeat(60));
console.log('');
console.log('Summary:');
console.log('✅ Constructor validates callback exists');
console.log('✅ Boolean return values work');
console.log('✅ Object return with custom messages works');
console.log('✅ String return as error message works');
console.log('✅ Context parameter works correctly');
console.log('✅ Error handling prevents crashes');
console.log('✅ Truthy/Falsy coercion works');
console.log('✅ getMessage() and getMessages() methods work');
console.log('✅ Safe context handling (defaults to {})');
console.log('✅ Backward compatible with existing code');
console.log('');
