# Contributing to TeachLink Mobile

Thank you for contributing to TeachLink Mobile!

## Pull Request Guidelines

When submitting a Pull Request, you must fill out the provided PR template.  
The template ensures that all necessary considerations are accounted for before merge.

Please review the `.github/pull_request_template.md` which includes:
- **Summary & Type of Change**: Describe what the PR does.
- **Testing Done**: List the tests performed.
- **Security Considerations**: Address concerns like secure data storage, token handling, input validation, and deep link handling.
- **Performance Considerations**: Address concerns like hook optimization (`useCallback`, `useMemo`), `FlatList` optimization, and asynchronous patterns.
- **Checklist**: General checks, including checking whether an Architectural Decision Record (ADR) is needed.

## Fast-Fail Syntax Gate

We have a dedicated **Syntax Gate** workflow (`.github/workflows/syntax.yml`) that runs on every pull request `opened` or `synchronize` event.

- Checks TypeScript compiler errors (`tsc --noEmit`) and ESLint (`eslint --max-warnings=0`)
- Optimized to complete in **under 90 seconds** using caching
- Required for branch protection — PRs cannot be merged if it fails
- Run checks locally before pushing to avoid CI failures

## Local Quality Checks

You can run the checks locally:

```bash
# Run ESLint linting
npm run lint

# Check formatting
npm run format:check

# Run TypeScript type check
npx tsc --noEmit
