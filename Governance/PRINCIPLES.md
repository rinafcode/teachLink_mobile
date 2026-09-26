# Guiding Engineering Principles

## Purpose

This document captures the engineering principles that guide technical decisions at TeachLink Mobile. These principles operationalize our core values (`Governance/VALUES.md`) into actionable technical guidance.

---

## 1. Mobile-First, Offline-Capable

**Principle**: Design for mobile constraints first; assume intermittent connectivity.

**Implications**:
- **Data model**: Local-first (SQLite/Realm/CoreData); sync is background, not blocking
- **UI**: Touch-first; thumb-zone navigation; large tap targets (48dp min)
- **Assets**: Compressed, responsive, lazy-loaded; no 4K assets on mobile
- **API**: Request batching; conditional requests (ETag/If-None-Match); delta sync
- **State**: Optimistic UI; conflict resolution on sync (last-write-wins + manual merge for conflicts)

**Anti-patterns**: Desktop-first layouts; mandatory online flows; large synchronous requests.

---

## 2. Privacy by Design, Not by Accident

**Principle**: Student and teacher data protection is an architectural constraint, not a feature.

**Implications**:
- **Data minimization**: Collect only what's needed; anonymous IDs where possible
- **Encryption**: At rest (SQLCipher/Keychain/Keystore); in transit (TLS 1.3+); keys in Secure Enclave/StrongBox
- **Consent**: Granular, revocable, auditable; parental consent for <13
- **Data locality**: User chooses storage region; no cross-border without consent
- **Retention**: Configurable TTL; auto-purge; right to deletion (GDPR Art. 17)
- **No telemetry without opt-in**: Crash reports anonymized; no PII in logs

**Anti-patterns**: Analytics by default; PII in URLs/logs; third-party trackers; cloud-first sync.

---

## 3. Sustainable Pace Over Heroics

**Principle**: Code that ships at the cost of contributor health is technical debt.

**Implications**:
- **Scope**: Small PRs (<400 lines); one logical change per PR
- **Review SLA**: 3 business days; no "urgent" bypasses
- **On-call**: Voluntary, rotating, max 1 week; compensated or time-off-in-lieu
- **Release cadence**: Predictable (monthly); no death marches
- **Technical debt**: 20% capacity allocated; tracked in backlog; visible to all
- **Meeting load**: Max 2 hrs/day sync; async-first decisions

**Anti-patterns**: Weekend deployments; "quick fix" without tests; hero merges; silent overtime.

---

## 4. Boring Technology, Boring Choices

**Principle**: Choose proven, well-understood tools over novel ones. Innovation budget is for product, not infra.

**Implications**:
- **Stack**: React Native + Expo (managed workflow); TypeScript; SQLite; REST + JSON
- **Dependencies**: Minimize; prefer stdlib; audit before add (`license-allowlist.json`)
- **Build**: EAS (managed); Fastlane for store; GitHub Actions CI
- **Observability**: Sentry (errors), LogRocket (session replay), Datadog (metrics) — standard tools
- **Secrets**: Expo Secrets / GitHub Actions Secrets / 1Password — no custom vault

**Anti-patterns**: Custom rendering engines; homegrown state management; bleeding-edge Rust/WASM in hot path; custom CI runners.

---

## 5. Accessibility as a Baseline, Not a Checkbox

**Principle**: If it's not accessible, it's broken.

**Implications**:
- **WCAG 2.1 AA**: Minimum for all new UI; automated (axe-core) + manual testing
- **Semantics**: Proper heading hierarchy, landmarks, roles, labels
- **Contrast**: 4.5:1 text, 3:1 UI components; forced colors mode tested
- **Keyboard/AT**: Full navigation via VoiceOver/TalkBack/Switch Control
- **Motion**: Respect `prefers-reduced-motion`; no auto-play video/audio
- **Language**: RTL support; dynamic type (Dynamic Type / sp); string externalization

**Anti-patterns**: Custom components without ARIA; color-only state indication; fixed font sizes; swipe-only actions.

---

## 6. Test Pyramid, Not Ice Cream Cone

**Principle**: Fast, reliable unit tests form the foundation; integration tests verify boundaries; E2E tests are few and critical.

**Implications**:
- **Unit (70%)**: Pure functions, hooks, utils, reducers — fast, deterministic, no mocks
- **Integration (20%)**: API clients, database layer, navigation, auth flows — real dependencies
- **E2E (10%)**: Critical user journeys (login, create class, submit assignment) — 5-10 scenarios
- **CI**: Unit on every push; integration on PR; E2E on release branch
- **Flaky tests**: Quarantined immediately; fixed or deleted within 48h

**Anti-patterns**: E2E for everything; mocking everything; no tests for "simple" code; ignored flaky tests.

---

## 7. Explicit Over Implicit

**Principle**: Code should reveal intent; magic creates maintenance burden.

**Implications**:
- **Types**: Strict TypeScript (`strict: true`); no `any`; discriminated unions for state
- **Configuration**: Explicit config files; no environment-specific code branches
- **Dependencies**: Explicit imports; no barrel files for externals; tree-shaking friendly
- **Errors**: Typed error types; no `throw new Error(string)`; Result/Either patterns
- **API contracts**: OpenAPI spec generated from code; breaking changes = major version + migration guide

**Anti-patterns**: `any` types; global singletons; magic strings; implicit global state; untyped JSON.

---

## 8. Security as a Shared Responsibility

**Principle**: Every contributor thinks about security; Security Officer enables, doesn't gatekeep.

**Implications**:
- **Dependencies**: `npm audit` / `cargo audit` in CI; Dependabot auto-PRs; `license-allowlist.json`
- **Secrets**: Never in code; `.env` in `.gitignore`; rotate on exposure
- **Permissions**: Minimal (camera, microphone, location, contacts); rationale documented
- **Network**: TLS 1.3+; certificate pinning for API; no cleartext traffic
- **Input validation**: Server-side + client-side; Zod schemas shared
- **Content Security Policy**: Strict CSP on web views; no `eval`/`Function` constructor

**Anti-patterns**: `dangerouslySetInnerHTML` without sanitization; `eval`/`Function`; HTTP in production; hardcoded keys.

---

## 9. Performance Budget, Not Afterthought

**Principle**: Define budgets upfront; measure continuously; regressions block release.

**Implications**:
- **Budgets** (v1 targets):
  - App start (cold): < 2.5s (iOS), < 3s (Android)
  - TTI (Time to Interactive): < 3.5s
  - Bundle size: < 50MB (iOS), < 80MB (Android)
  - Memory: < 150MB typical; < 300MB peak
  - Battery: < 5%/hr active use
- **Measurement**: E2E tests + CI perf checks; Sentry performance monitoring
- **Regression**: >10% degradation = release blocker

**Anti-patterns**: "We'll optimize later"; unmeasured animations; N+1 queries; unvirtualized lists.

---

## 10. Documentation Lives With Code

**Principle**: If it's not documented, it doesn't exist.

**Implications**:
- **README**: Every repo/module has purpose, setup, test, deploy
- **Architecture**: `docs/ARCHITECTURE.md` updated with structural changes
- **API**: OpenAPI spec generated from code; breaking changes = major version + migration guide
- **Decisions**: ADRs in `docs/adr/` for irreversible choices
- **Onboarding**: `docs/GETTING_STARTED.md` tested monthly by new contributor

**Anti-patterns**: Outdated README; tribal knowledge; "self-documenting code" myth; wiki separate from repo.

---

## Resolving Principle Conflicts

When principles conflict, apply the **Values Decision Matrix** (`Governance/VALUES.md`):

1. **Identify conflicting principles**
2. **Score each option** against all 7 core values (+1/0/-1)
3. **Net positive** → proceed; **net negative** → iterate; **mixed** → escalate to Maintainers
4. **Document** the trade-off in PR/ADR

**Example**: "Add analytics SDK for product insights"
- Learner-Centered: -1 (no direct student benefit)
- Open by Default: -1 (third-party tracker)
- Sustainable Pace: +1 (automated insights)
- Earned Trust: -1 (data leaves device)
- Pragmatic Craft: +1 (standard SDK)
- Inclusive Collaboration: 0
- Transparent Governance: -1 (opaque data collection)
- **Net: -2 → Reject or iterate with privacy-first alternative**

---

## Adoption & Enforcement

- **PR Template**: Includes principle checklist
- **CI Gates**: Lint, typecheck, tests, bundle size, accessibility
- **Code Review**: Reviewers verify principle alignment
- **Retrospectives**: Quarterly principle health check
- **Onboarding**: New contributors read this document (Step 3 of `Governance/processes/ONBOARDING.md`)

---

## Related Documents

- Core Values: `Governance/VALUES.md`
- Scope Statement: `Governance/SCOPE.md`
- Non-Goals: `Governance/NON_GOALS.md`
- This document: `Governance/PRINCIPLES.md`