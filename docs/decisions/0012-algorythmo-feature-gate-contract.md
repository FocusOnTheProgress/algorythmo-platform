# ADR-0012 — Algorythmo Feature Gate: 4-Layer Contract

**Status:** Accepted  
**Date:** 2026-05-22  
**Context:** M0.5 security + Captain gate retrofit  
**Deciders:** Gustavo (founder), engineer agent  
**Supersedes:** nothing — first gate contract  

---

## Context

Algorythmo OS builds on Chatwoot upstream. Some upstream features (starting with Captain AI) must be hidden from PME clients while remaining in the codebase for sync compatibility. Decision A6 in the MVP plan specifies Captain as the first gated surface, controlled by flag `algorythmo_show_captain` (default `false`).

A gate that lives in only one layer leaks when any other layer is bypassed. A client with devtools can navigate directly to a route, call an API endpoint, or render a component — each bypass vector requires its own enforcement.

## Decision

Enforce every feature gate through **4 explicit layers** in this order:

```
Request → [1] Listener → [2] Controller → [3] Router → [4] Component
                                                 Sidebar = auto (featureFlag meta)
```

### Layer 1 — Listener (backend event gate)

**File:** `enterprise/app/listeners/captain_listener.rb`

Return early from event handlers if `account.feature_enabled?('algorythmo_show_captain')` is false. Prevents Captain AI background jobs from firing even if Sidekiq enqueues an event for a gated account.

**Why here:** Event-driven work (conversation resolved → AI notes) bypasses HTTP entirely. Controller gate alone would not block it.

### Layer 2 — Controller (API gate)

**Files:**
- `engines/algorythmo/app/lib/algorythmo/feature_gate.rb` — pure module with `FeatureGate.feature_enabled?(account, flag)`, memoized via `Rails.cache.fetch` with a 30-second TTL per account+flag.
- `engines/algorythmo/app/controllers/concerns/algorythmo/feature_gate/controller_concern.rb` — `before_action :ensure_algorythmo_show_captain_enabled!` rendering `403 { error: 'Feature not enabled' }` when blocked.
- `enterprise/app/controllers/api/v1/accounts/captain/base_controller.rb` — all 9 Captain API controllers inherit from this; the concern is included once here.

**Why 30s cache:** `Account#feature_enabled?` queries the database (or Redis, depending on flag storage). On hot paths with multiple before_actions checking the same flag this would fan out N queries per request. 30 seconds is short enough that a flag toggle propagates within one minute across all workers — acceptable for a product flag, not a security boundary. The cache key is scoped to `account.id` + `flag_name` so no cross-account leakage.

**Why a shared base controller:** DRY. Adding a new Captain controller automatically gets the gate without needing to remember the concern include.

### Layer 3 — Router guard (Vue frontend gate)

**Files:**
- `app/javascript/dashboard/helper/routeHelpers.js` — pure function `isRouteBlockedByAlgorythmoGate(to, getter, accountId)` returning boolean.
- `app/javascript/dashboard/routes/index.js` — `validateAuthenticateRoutePermission` calls the function after permission check; redirects to `/accounts/:id/dashboard` when blocked.
- `app/javascript/dashboard/routes/dashboard/captain/captain.routes.js` — all Captain route objects carry `meta.algorythmoFeatureFlag: 'algorythmo_show_captain'`.

**Fail-closed:** the pure function catches all exceptions and returns `true` (blocked). If the Vuex store hasn't hydrated yet, the route stays closed. A user directly pasting a Captain URL into the browser will be redirected to dashboard before any Captain component mounts.

**Why not the existing `featureFlag` meta mechanism:** Chatwoot's existing `featureFlag` check (used for CAPTAIN, CAPTAIN_V2, etc.) maps to cloud feature flags on Chatwoot's own infrastructure — not to the per-account flags stored in our database. The `algorythmoFeatureFlag` meta key is additive and orthogonal.

### Layer 4 — Component (UI gate)

**File:** `app/javascript/dashboard/composables/useAlgorythmoFeatureGate.js`

Composable returning `{ isEnabled }` computed ref. Components wrapping Captain UI should check `isEnabled.value` before rendering. Default is `false` — fail-closed.

**Why a composable:** The router guard blocks navigation, but shared components (e.g. a sidebar item, a copilot suggestion button) can appear on non-Captain routes. The composable lets any component check the gate reactively without prop-drilling or duplicating store access.

### Sidebar = auto

The Captain sidebar entry is hidden by Chatwoot's existing `featureFlag: FEATURE_FLAGS.CAPTAIN` check on the route, which is only `true` on Cloud/Enterprise installations with the Captain feature. Since we set `algorythmo_show_captain: false` by default, and the sidebar entry reads the same route meta, it automatically hides without an extra gate. No fourth layer needed for the sidebar itself.

---

## Consequences

**Positive:**
- Defense in depth: bypassing the router guard still hits the controller 403.
- Bypassing the controller (direct DB access, internal jobs) still hits the listener gate.
- New Captain controllers inherit the gate automatically via `BaseController`.
- Flag toggle propagates within 30s (controller) and on next navigation (router, reactive).

**Negative / trade-offs:**
- The 30s cache means a flag toggle takes up to 30s to reflect in API responses. Acceptable for a product flag; not acceptable for a security boundary — if we ever use this mechanism for auth-level gates, reduce TTL or bypass cache.
- Adding a new Captain controller that doesn't inherit from `Captain::BaseController` silently bypasses the gate. Engineers must be aware of the convention. The engine spec asserts the gate is wired, but does not enumerate every subclass.
- The Vue router guard only runs on navigation. A component rendered on an already-active route won't re-check until the next navigation. Components should use `useAlgorythmoFeatureGate` for reactive correctness.

---

## Alternatives Considered

| Alternative | Reason rejected |
|---|---|
| Single-layer gate (router only) | API endpoints remain accessible via curl/Postman; events still fire |
| Single-layer gate (controller only) | Frontend shows Captain UI briefly before redirect; sidebar entry still visible |
| Global feature flag config (server restart required) | Too coarse for per-account control; breaks multi-tenant |
| Redis pub/sub invalidation for cache | Over-engineered for single-server MVP (P2); under-engineered for multi-tenant (needs account scope) |

---

## Implementation References

- `engines/algorythmo/app/lib/algorythmo/feature_gate.rb`
- `engines/algorythmo/app/controllers/concerns/algorythmo/feature_gate/controller_concern.rb`
- `enterprise/app/controllers/api/v1/accounts/captain/base_controller.rb`
- `enterprise/app/listeners/captain_listener.rb`
- `app/javascript/dashboard/helper/routeHelpers.js` (`isRouteBlockedByAlgorythmoGate`)
- `app/javascript/dashboard/routes/dashboard/captain/captain.routes.js` (`algorythmoFeatureFlag` meta)
- `app/javascript/dashboard/composables/useAlgorythmoFeatureGate.js`
