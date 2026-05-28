# Unused Packages — depcheck Findings

> Generated: 2026-05-27 | Issue: [#218](https://github.com/shogun444/teachLink_mobile/issues/218)

## Summary

`depcheck` identified 17 packages that were installed but never imported in source code. After manual verification, **17 packages were removed** (4 dependencies, 13 devDependencies).

## Removed Packages

### Dependencies

| Package               | Version | Reason                                               |
| --------------------- | ------- | ---------------------------------------------------- |
| `expo-system-ui`      | ~6.0.9  | Not imported anywhere; no app.json plugin entry      |
| `react-native-dotenv` | ^3.4.11 | Replaced by Expo's built-in `EXPO_PUBLIC_*` env vars |
| `tailwind-merge`      | ^3.4.0  | Not imported in any source file                      |
| `tslog`               | ^4.9.2  | Referenced only in comments; not imported            |

### devDependencies

| Package                        | Version  | Reason                                                     |
| ------------------------------ | -------- | ---------------------------------------------------------- |
| `@testing-library/jest-native` | ^5.4.3   | Not used in any test file                                  |
| `@types/babel__core`           | ^7.20.5  | Not referenced; `@babel/core` ships its own types          |
| `@types/babel__generator`      | ^7.27.0  | Not referenced                                             |
| `@types/babel__template`       | ^7.4.4   | Not referenced                                             |
| `@types/babel__traverse`       | ^7.28.0  | Not referenced                                             |
| `@types/jest`                  | 29.5.14  | Provided transitively by `jest-expo`                       |
| `@types/node`                  | ^25.0.10 | Not needed; project targets React Native, not Node         |
| `@types/react-native-dotenv`   | ^0.2.2   | `react-native-dotenv` itself was removed                   |
| `eslint-plugin-import`         | ^2.32.0  | Bundled as a dependency of `eslint-config-expo`            |
| `eslint-plugin-react`          | ^7.37.5  | Bundled as a dependency of `eslint-config-expo`            |
| `eslint-plugin-react-hooks`    | ^7.1.1   | Bundled as a dependency of `eslint-config-expo`            |
| `ts-jest`                      | ^29.4.6  | Not used; jest config uses `jest-expo` preset              |
| `typescript`                   | ~5.9.2   | Not referenced in any script; provided by `expo` toolchain |

## Packages Kept (flagged by depcheck but intentionally retained)

| Package                       | Reason                                        |
| ----------------------------- | --------------------------------------------- |
| `expo-asset`                  | Listed as an Expo config plugin in `app.json` |
| `expo-speech-recognition`     | Listed as an Expo config plugin in `app.json` |
| `prettier-plugin-tailwindcss` | Configured as a plugin in `.prettierrc`       |
