# Jest ES Module Configuration Fix
## Solution for Critical Issue #1

**Priority:** CRITICAL  
**Estimated Time:** 30 minutes  
**Difficulty:** Medium  

---

## 🎯 Problem Summary

Jest cannot parse ES modules, causing all tests to fail with the error:
```bash
SyntaxError: Cannot use 'import.meta' outside a module
```

---

## 🔧 Solution Implementation

### Step 1: Update Jest Configuration

**File:** `jest.config.js`

**Current Configuration (Problematic):**
```javascript
export default {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/index.js',
    '!src/config/*.js',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.js',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
  ],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.js$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
      ],
    }],
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  verbose: true,
  testTimeout: 10000,
};
```

**New Configuration (Fixed):**
```javascript
export default {
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.js'],
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/index.js',
    '!src/config/*.js',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.js',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
  ],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.js$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { 
          targets: { node: 'current' },
          modules: 'auto'
        }],
      ],
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  verbose: true,
  testTimeout: 10000,
};
```

### Step 2: Create Babel Configuration

**File:** `babel.config.js` (Create new file)

```javascript
module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: {
        node: 'current'
      },
      modules: 'auto'
    }]
  ],
  plugins: [
    '@babel/plugin-transform-modules-commonjs'
  ]
};
```

### Step 3: Update Package.json Scripts

**File:** `package.json`

**Add to scripts section:**
```json
{
  "scripts": {
    "test": "NODE_OPTIONS='--experimental-vm-modules' jest --coverage",
    "test:watch": "NODE_OPTIONS='--experimental-vm-modules' jest --watch",
    "test:integration": "NODE_OPTIONS='--experimental-vm-modules' jest --testMatch='**/*.integration.test.js'"
  }
}
```

### Step 4: Update Test Setup File

**File:** `tests/setup.js`

**Current setup (if exists):**
```javascript
// Basic setup
```

**Enhanced setup:**
```javascript
// ES Module support for tests
import { jest } from '@jest/globals';

// Global test configuration
global.console = {
  ...console,
  // Suppress console.log during tests unless explicitly needed
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
process.env.JWT_SECRET = 'test-secret';
```

---

## 🧪 Testing the Fix

### Step 1: Test Jest Configuration
```bash
# Test if Jest can now parse ES modules
npm test -- --dry-run
```

### Step 2: Run a Single Test
```bash
# Test a specific test file
npm test -- tests/unit/models/Product.test.js
```

### Step 3: Run All Tests
```bash
# Run complete test suite
npm test
```

### Expected Results
- ✅ No more `import.meta` syntax errors
- ✅ Tests can load and execute
- ✅ Coverage data is collected
- ✅ All test suites run successfully

---

## 🔍 Verification Steps

### 1. Check Jest Can Parse Files
```bash
# Should not show syntax errors
npx jest --listTests
```

### 2. Verify ES Module Support
```bash
# Should run without module errors
npm test -- --verbose
```

### 3. Check Coverage Collection
```bash
# Should generate coverage report
npm test -- --coverage
```

---

## 🚨 Troubleshooting

### Issue: Still Getting Module Errors
**Solution:** Ensure Node.js version is 18+ and try:
```bash
# Clear Jest cache
npx jest --clearCache
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Issue: Babel Transformation Errors
**Solution:** Check Babel configuration:
```bash
# Test Babel transformation
npx babel src/config/index.js --out-file test-output.js
```

### Issue: Coverage Not Working
**Solution:** Check coverage configuration:
```bash
# Run with coverage debugging
npm test -- --coverage --verbose
```

---

## 📋 Implementation Checklist

- [ ] Update `jest.config.js` with ES module support
- [ ] Create `babel.config.js` with proper configuration
- [ ] Update `package.json` test scripts
- [ ] Enhance `tests/setup.js` if needed
- [ ] Test Jest configuration with `--dry-run`
- [ ] Run single test to verify fix
- [ ] Run complete test suite
- [ ] Verify coverage collection works
- [ ] Document any additional changes needed

---

## 🎯 Success Criteria

- [ ] Jest can parse ES modules without errors
- [ ] All test files load successfully
- [ ] Test execution completes without syntax errors
- [ ] Coverage data is collected properly
- [ ] Test suite runs to completion

---

**Status:** Ready for implementation - Complete solution provided with step-by-step instructions.
