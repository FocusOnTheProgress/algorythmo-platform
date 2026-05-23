Algorythmo::Engine.routes.draw do
  # Mount point: /algorythmo
  # Engine-scoped routes live here. All paths are prefixed /algorythmo by the host.
  root to: proc { [200, {}, ['Algorythmo OS engine']] }

  # M1 — CRM API routes
  # All routes sit behind the algorythmo_crm feature gate (checked in BaseController).
  namespace :api do
    namespace :v1 do
      scope '/accounts/:account_id' do
        # Lead CRUD + move + reopen
        resources :leads, only: %i[index show create update destroy] do
          member do
            patch :move
            post  :reopen
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
