# Custom Babel Production Optimizations Plugin

This document describes the design, implementation, and verification of the custom Babel optimization plugin (`teachlink-production-optimizer`) created for TeachLink Mobile.

## Motivation & Goals
Large-scale React Native and Expo applications can experience runtime and bundle-size overhead from verbose syntax structures, dead control-flow branches, and unresolved conditional checks. 

This plugin automates safe, compile-time AST (Abstract Syntax Tree) transformations on local file syntax, reducing bundle footprint and avoiding CPU cycles at runtime. It focuses strictly on deterministic, single-file scopes to prevent cross-module side-effects.

---

## Excluded Scope: Unused Export Removal
While dead-code elimination is a desirable goal, **unused export removal is explicitly excluded from this plugin's scope**. 

Because Babel transforms files in complete isolation (one file at a time), it is architecturally impossible for a file-local Babel plugin to safely determine if an export is referenced in another file without performing whole-program dependency graph analysis. Removing exports based purely on local scope would break imports across the application. 

Robust, safe tree-shaking and cross-module dead-code elimination are handled further down the build pipeline by bundlers (such as Metro, Rollup, or Terser) rather than compile-time Babel plugins.

---

## Supported Optimizations

### 1. Object Literal Shorthand Collapse
Collapses traditional key-value properties into ES6 shorthand syntax when the key and value identifiers match.

**Before:**
```javascript
const obj = {
  theme: theme,
  user: user,
};
```

**After:**
```javascript
const obj = {
  theme,
  user,
};
```

*Note: Computed properties (e.g. `{[theme]: theme}`) are automatically ignored to preserve semantic correctness.*

---

### 2. Constant If-Statement Folding
Simplifies `if` statements with compile-time boolean literals by inlining the target branch directly.

**Before (Truthy):**
```javascript
if (true) {
  render();
}
```
**After (Truthy):**
```javascript
render();
```

---

### 3. Dead Branch Removal
Completely eliminates code blocks belonging to unfollowed branches when the condition resolves to `false` at compile time. If an `else` branch is present, it replaces the entire `if` statement.

**Before (Falsy, No Else):**
```javascript
if (false) {
  expensiveCall();
}
```
**After (Falsy, No Else):**
*(Entire block is removed)*

**Before (Falsy, With Else):**
```javascript
if (false) {
  expensiveCall();
} else {
  cheapCall();
}
```
**After (Falsy, With Else):**
```javascript
cheapCall();
```

---

### 4. Conditional Ternary Folding
Folds ternary expressions utilizing constant boolean literals.

**Before:**
```javascript
const x = true ? a : b;
const y = false ? a : b;
```

**After:**
```javascript
const x = a;
const y = b;
```

---

### 5. Logical Expression Folding
Folds logical operators (`&&` and `||`) utilizing compile-time constant boolean literals.

**Before:**
```javascript
const val1 = true && doSomething();
const val2 = false && doSomething();
const val3 = true || fallback();
const val4 = false || fallback();
```

**After:**
```javascript
const val1 = doSomething();
const val2 = false;
const val3 = true;
const val4 = fallback();
```

---

## Integration and Setup
The plugin is registered inside `babel.config.js` and loaded via robust path resolution:

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
    plugins: [
      require.resolve('./tools/babel-plugins/productionOptimizer'),
      'react-native-reanimated/plugin',
    ],
  };
};
```

---

## Verification and Testing
We have added unit tests specifically targeting the custom plugin under `tests/babel/productionOptimizer.test.ts`.

To execute unit tests:
```powershell
npx jest tests/babel
```

To run full integration with the Metro route size analyzer:
```powershell
npm run analyze:routes
```
