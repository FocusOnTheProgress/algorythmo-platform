Algorythmo::Engine.routes.draw do
  # Mount point: /algorythmo
  # Engine-scoped routes live here. All paths are prefixed /algorythmo by the host.
  root to: proc { [200, {}, ['Algorythmo OS engine']] }

  # M3-late HTTP scaffold — gated by feature flag `algorythmo_brain_mcp_http` (OFF default).
  # Flag OFF → 404. Flag ON (M3.5+) → OAuth Dynamic Client Registration (RFC 7591).
  namespace :oauth do
    post 'clients', to: 'dcr#create'
  end

  # M1 — CRM API routes
  # All routes sit behind the algorythmo_crm feature gate (checked in BaseController).
  namespace :api do
    namespace :v1 do
      scope '/accounts/:account_id' do
        # B.0 — Pipeline default endpoint (precondition for Kanban frontend).
        # Returns the default pipeline + ordered stages so the client can render columns.
        # M1-D: pipelines/:id/metrics retorna o payload de observabilidade do funil
        # (KanbanHeader + chips por estagio) — ver CONTRACT_M1B §9 v1.2.0.
        resources :pipelines, only: [] do
          collection do
            get :default
          end
          member do
            get :metrics, to: 'pipeline_metrics#show'
          end
        end

        # Lead CRUD + move + reopen + conversations (B.0) + stage_history (M1-C PR3)
        resources :leads, only: %i[index show create update destroy] do
          member do
            patch :move
            post  :reopen
            get   :conversations
            get   :stage_history
          end
        end

        # Stage rename + aging_coefficient update
        resources :stages, only: %i[update] do
          member do
            patch :rename
          end
        end

        # M3 — Brain API routes (PR M3-1 gate)
        # All routes inherit Algorythmo::Api::V1::Brain::BaseController which enforces:
        #   (1) Chatwoot auth chain, (2) algorythmo_crm feature gate, (3) TenantResolution concern.
        # Stub controllers return 501 — implementations land in T1–T4.
        namespace :brain do
          # GET  /brain/compiled_truth → Brain::CompiledTruthController#show  (T1, PR M3-4)
          resource :compiled_truth, only: %i[show], controller: 'compiled_truth'

          # GET  /brain/timeline      → Brain::TimelineController#index        (T1, PR M3-4)
          resources :timeline, only: %i[index], controller: 'timeline'

          # POST /brain/adjustments   → Brain::AdjustmentsController#create    (T1, PR M3-5)
          # Enqueues IngestionWorker — does NOT call gbrain synchronously.
          resources :adjustments, only: %i[create], controller: 'adjustments'

          # POST /brain/documents  → Brain::DocumentsController#create  (0012 PR3 — upload)
          # GET  /brain/documents  → Brain::DocumentsController#index   (0012 PR3 — "Ver")
          # Validates (§4.3) before storing the blob, then enqueues
          # BrainDocumentIngestionWorker (extract → markdown → capture under WriteLock).
          resources :documents, only: %i[index create], controller: 'documents'

          # GET  /brain/snapshots     → Brain::SnapshotsController#index       (T4, PR M3-7)
          resources :snapshots, only: %i[index], controller: 'snapshots'

          # POST   /brain/mcp_token   → Brain::McpTokensController#create      (T3, PR M3-6)
          resource :mcp_token, only: %i[create], controller: 'mcp_tokens'

          # DELETE /brain/mcp_sessions → Brain::McpSessionsController#destroy  (T3, PR M3-6)
          resource :mcp_sessions, only: %i[destroy], controller: 'mcp_sessions'
        end
      end
    end
  end
end
