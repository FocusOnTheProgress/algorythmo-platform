Algorythmo::Engine.routes.draw do
  # Mount point: /algorythmo
  # Engine-scoped routes live here. All paths are prefixed /algorythmo by the host.
  root to: proc { [200, {}, ['Algorythmo OS engine']] }

  # M1 — CRM API routes
  # All routes sit behind the algorythmo_crm feature gate (checked in BaseController).
  namespace :api do
    namespace :v1 do
      scope '/accounts/:account_id' do
        # B.0 — Pipeline default endpoint (precondition for Kanban frontend).
        # Returns the default pipeline + ordered stages so the client can render columns.
        resources :pipelines, only: [] do
          collection do
            get :default
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
      end
    end
  end
end
