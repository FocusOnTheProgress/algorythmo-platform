# frozen_string_literal: true

module Algorythmo
  class Engine < ::Rails::Engine
    isolate_namespace Algorythmo

    config.generators do |g|
      g.test_framework :rspec
    end

    # Mount engine migrations alongside host app migrations so db:migrate picks them up.
    initializer 'algorythmo.append_migrations' do |app|
      unless app.root.to_s == root.to_s
        config.paths['db/migrate'].expanded.each do |path|
          app.config.paths['db/migrate'] << path
        end
      end
    end

    # Register Algorythmo::CrmListener with the host AsyncDispatcher.
    # Extension point: AsyncDispatcher.prepend_mod_with loads Enterprise::AsyncDispatcher;
    # we layer Algorythmo::AsyncDispatcher on top via the same mechanism.
    # algorythmo: auto-create-lead-d6
    initializer 'algorythmo.extend_async_dispatcher', after: :load_config_initializers do
      ActiveSupport.on_load(:after_initialize) do
        # Guard: only extend if AsyncDispatcher exists (host boot guarantee).
        AsyncDispatcher.prepend(Algorythmo::AsyncDispatcher) if defined?(AsyncDispatcher)
      end
    end

    # Load engine-specific i18n files AFTER the host i18n setup so engine keys win.
    # By appending to i18n.load_path, our keys override upstream Chatwoot brand strings
    # because Rails processes load_path in order (last definition wins per key).
    # algorythmo: rebrand-m0
    config.after_initialize do
      engine_locales = Dir[Algorythmo::Engine.root.join('config', 'locales', '*.{rb,yml}')]
      I18n.load_path += engine_locales
      I18n.reload! if I18n.respond_to?(:reload!)
    end

    # Register engine rake tasks with the host application.
    rake_tasks do
      Dir[root.join('lib', 'tasks', '**', '*.rake')].each { |f| load f }
    end
  end
end
