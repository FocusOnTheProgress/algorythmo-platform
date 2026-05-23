Algorythmo::Engine.routes.draw do
  # Mount point: /algorythmo
  # Engine-scoped routes live here. All paths are prefixed /algorythmo by the host.
  # M0 — no routes yet; structure ready for M1 (CRM Kanban API).
  root to: proc { [200, {}, ['Algorythmo OS engine']] }
end
