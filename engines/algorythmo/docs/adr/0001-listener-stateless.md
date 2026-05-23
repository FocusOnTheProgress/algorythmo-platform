# ADR-0001 (Engine) — Listener stateless

**Status:** Accepted
**Date:** 2026-05-22

## Context

`Algorythmo::CrmListener` is a singleton (inherits `BaseListener` which `include Singleton`).
Sidekiq workers are multi-threaded. If a listener method stores state in an instance variable
(`@ivar`), concurrent jobs share that state and corrupt each other (state poisoning).

## Decision

**PROHIBITED: `@ivar` in any `Algorythmo::CrmListener` method.**

All computation must resolve through:
- Local variables in the method scope.
- `Rails.cache` with scoped keys (never raw global keys).
- Passed parameters.

This is enforced by an RSpec assertion:
```ruby
expect(Algorythmo::CrmListener.instance.instance_variables).to be_empty
```
Run after each public method invocation in the listener spec.

## Consequences

- No session/request state leaks between concurrent Sidekiq workers.
- Cache reads/writes must be atomic and scoped by account/contact.
- `Rails.cache.fetch` is fine; `@cached_pipeline ||= ...` is not.

## Engineer agent checklist

Before merging any PR that touches `CrmListener`:
1. `grep -n "@[a-z]" engines/algorythmo/app/listeners/algorythmo/crm_listener.rb` must return zero hits.
2. The stateless RSpec assertion must pass.
