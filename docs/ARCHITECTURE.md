# Architecture

This document describes how the TeachLink Mobile codebase is organised, the
dependency direction between layers, and the rule for where new code goes. It is
the single source of truth for module boundaries; when a cross-cutting concern
appears, the instinct should be to find the existing module, not create a second
one next to it.

## Runtime entry points

There are two entry points defined in `package.json`/`app.json`:

- **`app/`** — the live application, driven by **expo-router** (`"main":
  "expo-router/entry"`). Every file here is a route. Navigation is implicit by
  file layout (`app/(tabs)/`, `app/profile/`, …), and `app/_layout.tsx` is the
  root layout that mounts the single global `ErrorBoundary`, analytics, keyboard,
  offline, and update providers.
- **`App.tsx`** — a **legacy, unreachable** React-Native entry that predates the
  expo-router migration. It is not wired to the build and is out of the routing
  graph. Do not add code here; prefer `app/`.

## Layers and dependency direction

The code is organised into a small number of layers with a single dependency
direction. Lower layers never import upper layers.

```
app/  (expo-router routes — outermost, may import everything below)
 └─ src/components/  (presentation: UI building blocks, screens-level widgets)
     └─ src/hooks/   (presentation-adjacent behaviour, called by components)
         └─ src/services/  (domain + infrastructure: API, socket, sync, storage)
             └─ src/store/  (client state, Zustand stores)
                 └─ src/utils/  (pure, reusable helpers — the leaf)
```

The rule: **an upper layer may import from any layer below it; a lower layer
must never import from a layer above it.** In practice the strongest
boundaries are:

- `src/services/` must not import `src/components/` at runtime.
- `src/utils/` must not import `src/services/`, `src/store/`, `src/hooks/`, or
  `src/components/`.
- Nothing under `src/` imports `app/`.

These boundaries are enforced automatically — see
[Dependency enforcement](#dependency-enforcement).

## Directory roles

| Path | Layer | Role |
|---|---|---|
| `app/` | routes | expo-router file-based routes and root layout. Thin: it wires screens/providers together. |
| `src/components/` | presentation | Re-usable UI primitives, feature widgets, and modal/sheet components. Subdirectories: `common/` (shared primitives), `mobile/` (mobile feature components), `grid/`, `ui/`, `dashboard/`. |
| `components/` | presentation (legacy) | Top-level hand-written UI (e.g. `themed-text.tsx`, `haptic-tab.tsx`, `ui/`). Historically separate from `src/components/`; new UI should go under `src/components/`. |
| `src/hooks/` | behaviour | Custom hooks that wrap services/store and expose stateful or effectful behaviour to components. |
| `src/services/` | domain/infra | `api/` (HTTP + axios), `socket/`, `sync/` (conflict resolution), `syncService.ts`, location, storage, crash reporting, metrics, notifications. Single-file services for one responsibility. |
| `src/store/` | state | Zustand clientside stores (`featureFlagStore`, `courseProgressStore`, `quizStore`, …). Seeded by services, consumed by hooks/components. |
| `src/utils/` | foundation | Pure helpers with no app-layer imports (logger, link parser, image utils, geo utils, crypto, storage wrappers). |
| `src/config/` | config | Environment/config constants (`env`, `logging`, api). |
| `src/constants/` | constants | Static values (theme colors, enums, copy). |
| `src/types/` | types | Shared TypeScript types. |
| `src/navigation/` | routes (legacy) | Pre-expo-router React Navigation (`AppNavigator`, `linking`). No longer referenced by `app/`; retained for historical context. |
| `src/pages/`, `src/screens/` | routes (legacy) | Pre-expo-router page/screen components. **Nothing in the live tree imports them** — see [app/ vs pages vs screens](#app-vs-pages-vs-screens). |
| `src/audit/` | tooling | Local performance/security audit CLI and analyzers. |
| `src/styles/` | styles | Shared styles (GlobalStyles, splash critical CSS). |

### app/ vs src/pages/ vs src/screens/

The live application is entirely in `app/` (expo-router). `src/screens/` and
`src/pages/` are **orphaned remnants** of the pre-router era: a codebase-wide
`grep` finds no importers of either directory outside themselves. They overlap
with `app/` and with each other, and neither is part of the routing graph.

**Recommendation:** consolidate `src/screens/` and `src/pages/` into `app/`
screens during the component cleanup, then delete the two directories. That is a
structural task tracked separately (`docs/adr/README.md` links the ADRs); until
it lands, treat `app/` as the only live presentation-of-routes location.

## Where new code goes

- A new **screen/route** → a file under `app/`.
- A new **re-usable UI primitive or feature widget** → `src/components/{common,mobile,ui,grid,dashboard}/` (not top-level `components/`).
- A new **hook** → `src/hooks/`.
- A new **service/infrastructure module** → `src/services/`, adding a directory only when a single file would grow past a few hundred lines.
- A new **store** → `src/store/`.
- A new **pure helper** → `src/utils/`.
- A new **shared type** → `src/types/`; a new **constant** → `src/constants/`; a new **env reading** → `src/config/`.

Before creating a new module, search for an existing one. The duplicate-module
cleanup backlog (below) exists precisely because modules were invented instead of
found.

## Dependency enforcement

The intended direction is enforced with
[dependency-cruiser](https://github.com/sverweij/dependency-cruiser). The rules
live in `dependency-cruiser.config.js` and are run with:

```bash
npm run architecture:check
```

The config encodes the three hard boundaries above (`no-src-to-app`,
`no-services-to-components-at-runtime`, `no-utils-to-higher-layers`,
`no-circular-between-layers`). `type-only` imports are allowed across the
services→components boundary so a service can reuse a public type without a
runtime dependency on the presentation layer. CI runs this check in the
`architecture` job (`.github/workflows/architecture.yml`).

## Cross-cutting concerns (single modules, not parallel copies)

These concerns are intended to have **one** implementation each. Before adding a
second, read the existing one:

- **Error handling** — one `ErrorBoundary` (`src/components/common/ErrorBoundary.tsx`).
- **Location** — one location service plus `useLocation` and `geoUtils`.
- **Course progress** — one store (`src/store/courseProgressStore.ts`) and one hook (`src/hooks/useCourseProgress.ts`).
- **Sync conflict resolution** — `src/services/sync/conflictResolver.ts` and `src/store/conflictStore.ts`.
- **Feature flags / experimentation** — `src/hooks/useFeatureFlags.ts`, `src/store/featureFlagStore.ts`, `src/store/degradationStore.ts`, and `docs/AB_TESTING.md`.
- **Logging** — `src/utils/logger` (`appLogger`). Never `console.*` (see `docs/adr/ADR-005-logging-infrastructure.md` and `README.md` "Logging").

## Cleanup backlog

The following overlaps are known symptoms of an undocumented structure and are
tracked as separate issues rather than fixed here:

- Six modules covering feature flags / experimentation.
- Three UI component directories (`src/components/{common,mobile,ui,...}`, `components/`, `components/ui`).
- The un-migrated `src/navigation/`, `src/pages/`, and `src/screens/` remnants.
- Test files scattered across `src/__tests__/`, colocated `__tests__/`, and `tests/`.

## Related documents

- ADRs: `docs/adr/` (state management, api caching, auth storage, streaming, logging).
- `docs/` — one strategy/design doc per concern (offline-first data layer, conflict
  resolution, error-boundary retry, location strategy, performance monitoring, etc.).

See also the `CONTRIBUTING.md` pull-request and quality-gate guidance.
