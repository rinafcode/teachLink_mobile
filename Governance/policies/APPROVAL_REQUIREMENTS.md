# PR Approval Requirements

This document defines the approval requirements and mandatory checks for pull requests in the TeachLink Mobile repository. All contributors and maintainers must follow these policies to ensure code quality, security, and stability.

## Overview

Pull requests must meet both **approval requirements** (human review) and **automated checks** (CI/CD) before they can be merged. Requirements vary by change type and risk level.

## Change Types and Approval Requirements

### 1. Documentation Changes
**Risk Level:** Low  
**Required Approvals:** 1 maintainer  
**Required Checks:** 
- CI workflow (lint, format check, typecheck)

**Examples:**
- README updates
- Code comments
- Documentation files in `docs/`
- Inline documentation

### 2. Bug Fixes
**Risk Level:** Medium  
**Required Approvals:** 1 maintainer  
**Required Checks:**
- CI workflow (all checks)
- Test workflow (unit tests)
- Performance regression tests (if applicable)
- Relevant test coverage for the fix

**Examples:**
- Bug fixes in application logic
- UI bug fixes
- API integration fixes
- Error handling improvements

### 3. Feature Additions
**Risk Level:** Medium-High  
**Required Approvals:** 2 maintainers  
**Required Checks:**
- CI workflow (all checks)
- Test workflow (unit tests + performance regression)
- Bundle size check (must pass budget)
- API performance check (if API changes)
- Test coverage for new features
- OpenAPI spec validation (if API changes)

**Examples:**
- New user-facing features
- New components
- New API integrations
- New navigation routes

### 4. Refactoring
**Risk Level:** Medium  
**Required Approvals:** 1 maintainer  
**Required Checks:**
- CI workflow (all checks)
- Test workflow (all tests must pass)
- Performance regression tests (must not degrade)
- Bundle size check (must not increase significantly)

**Examples:**
- Code reorganization
- Performance optimizations
- Dependency updates
- Architecture improvements

### 5. Configuration Changes
**Risk Level:** Variable  
**Required Approvals:** 1-2 maintainers (based on impact)  
**Required Checks:**
- CI workflow (lint, format check, typecheck)
- Relevant validation scripts

**Examples:**
- Build configuration changes
- Environment variable changes
- CI/CD workflow modifications
- EAS build profile changes

### 6. Security Changes
**Risk Level:** High  
**Required Approvals:** 2 maintainers + security review  
**Required Checks:**
- CI workflow (all checks)
- Test workflow (all tests)
- Security audit (`npm audit`)
- Dependency vulnerability check
- Manual security review

**Examples:**
- Authentication/authorization changes
- Data encryption changes
- API security changes
- Dependency security updates

### 7. Performance Changes
**Risk Level:** Medium-High  
**Required Approvals:** 1-2 maintainers  
**Required Checks:**
- CI workflow (all checks)
- Performance regression tests (must pass)
- Bundle size check (must pass budget)
- API performance check (if applicable)
- Performance audit reports

**Examples:**
- Performance optimizations
- Bundle size reductions
- Memory usage improvements
- Rendering performance changes

### 8. Breaking Changes
**Risk Level:** Critical  
**Required Approvals:** 2 maintainers + project lead approval  
**Required Checks:**
- CI workflow (all checks)
- Test workflow (all tests)
- Performance regression tests
- Full test suite with coverage
- Migration guide (if applicable)
- Release notes impact assessment

**Examples:**
- API contract changes
- Major version updates
- Removed features
- Data model changes

## Required Checks

All PRs must pass the following automated checks:

### CI Workflow Checks
- **Lint:** `npm run lint` - Code quality and style
- **Format Check:** `npm run format:check` - Code formatting consistency
- **Typecheck:** `npx tsc --noEmit` - TypeScript type safety
- **Test:** `npm test -- --passWithNoTests` - Unit test suite
- **OpenAPI Validation:** `npm run validate:openapi` - API contract validation
- **Bundle Size Check:** `node scripts/checkBundleSize.js` - Bundle size within budget
- **API Performance Check:** `node scripts/checkApiPerf.js` - API response time within limits

### Test Workflow Checks
- **Unit Tests:** `npm test -- --runInBand` - Full test suite
- **Performance Regression Tests:** `npm test -- --testPathPattern=perf --runInBand` - Performance benchmarks

### Additional Checks (Context-Dependent)
- **Performance Audit:** `npm run audit:performance` - For performance-related changes
- **Bundle Size Analysis:** `npm run analyze:routes:report` - For route/feature changes
- **Dependency Audit:** `npm audit` - For dependency updates
- **Depcheck:** `npm run depcheck` - For dependency cleanup

## Override Rules

### Emergency Overrides
In emergency situations (security vulnerabilities, critical production issues), the following override process applies:

1. **Emergency Declaration:** PR must be labeled with `emergency` and include a detailed explanation of the emergency
2. **Minimum Approvals:** 2 maintainers (reduced from normal requirements)
3. **Checks Required:** Critical checks only (lint, typecheck, critical tests)
4. **Post-Merge Requirements:** 
   - Full test suite must pass within 24 hours
   - Follow-up PR must address any skipped checks
   - Incident report must be filed

### Maintainer Override
Maintainers can override approval requirements for:
- Trivial changes (typos, whitespace)
- Documentation-only changes
- CI/CD workflow fixes
- Emergency situations (see above)

Override process:
1. Maintainer adds `override-approval` label
2. Maintainer comments with override justification
3. All required checks must still pass
4. Override is logged in monthly governance review

### Test Failures
Test failures cannot be overridden except in emergency situations. If tests fail:
1. PR cannot be merged
2. Failing tests must be fixed or marked as expected failures with justification
3. Expected failures must be reviewed and approved by 2 maintainers

## Review Process

### Reviewer Responsibilities
- **Code Quality:** Ensure code follows project standards and best practices
- **Functionality:** Verify the change addresses the issue/feature correctly
- **Testing:** Confirm adequate test coverage exists
- **Performance:** Assess performance impact for relevant changes
- **Security:** Identify potential security issues
- **Documentation:** Ensure documentation is updated if needed

### Author Responsibilities
- **Description:** Provide clear PR description with:
  - Problem statement
  - Solution approach
  - Testing performed
  - Breaking changes (if any)
- **Testing:** Ensure all tests pass and new tests are added for new functionality
- **Documentation:** Update relevant documentation
- **Communication:** Respond to review feedback promptly

### Review Timeline
- **Target Response Time:** Reviewers should respond within 2 business days
- **Follow-up:** Authors should address feedback within 3 business days
- **Stale PRs:** PRs with no activity for 7 days may be closed

## Branch Protection Rules

The following branch protection rules are enforced on the `main` branch:

1. **Required Status Checks:** All CI and test workflow checks must pass
2. **Required Approvals:** Based on change type (see above)
3. **Dismiss Stale Reviews:** New commits require re-approval
4. **Require Linear History:** Merge commits must be rebased or squashed
5. **Restrict Pushes:** Direct pushes to main are disabled

## Testing Requirements

### Unit Tests
- All new features must have unit tests
- Bug fixes must include regression tests
- Test coverage should not decrease
- Tests must be deterministic and repeatable

### Integration Tests
- API changes must include integration tests
- Complex workflows should have end-to-end tests
- Performance-critical paths must have performance tests

### Performance Tests
- Performance changes must include regression tests
- Baseline performance must be documented
- Performance degradation requires justification

## Documentation Requirements

### Code Documentation
- Public APIs must have JSDoc comments
- Complex logic must have inline comments
- Configuration changes must be documented

### Project Documentation
- Features must be documented in README
- Breaking changes must be documented in CHANGELOG.md
- Architecture decisions must be documented in `docs/`

## Governance and Compliance

### Monthly Review
- Approval requirements are reviewed monthly
- Override logs are audited
- Process improvements are implemented

### Exception Handling
- Exceptions to these policies require project lead approval
- Exceptions are documented and reviewed monthly
- Recurring exceptions trigger policy updates

### Policy Updates
- This document is version-controlled
- Changes require 2 maintainer approvals
- Major changes require community discussion

## Change Log

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0.0 | 2026-09-25 | Initial approval requirements document | Devin |

## Related Documents

- [CONTRIBUTING.md](../../CONTRIBUTING.md) (if exists)
- [README.md](../../README.md)
- [DEPLOY.md](../../DEPLOY.md)
- CI/CD workflows in `.github/workflows/`
