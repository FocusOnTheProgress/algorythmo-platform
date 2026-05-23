# frozen_string_literal: true

class Algorythmo::Engine < Rails::Engine
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
  # Using `after: 'finisher_hook'` ensures the host app is fully loaded (all
  # models, constants, and Enterprise extensions) before we extend AsyncDispatcher.
  # This is deterministic at boot, unlike the deferred ActiveSupport.on_load(:after_initialize)
  # pattern which can fire at unpredictable points during request-time lazy loading.
  # algorythmo: auto-create-lead-d6
  initializer 'algorythmo.extend_async_dispatcher', after: 'finisher_hook' do
    # Guard: only extend if AsyncDispatcher exists (Enterprise edition only).
    # FOSS builds without Enterprise do not have AsyncDispatcher — skip silently.
    if defined?(AsyncDispatcher) && defined?(Algorythmo::AsyncDispatcher) && !AsyncDispatcher <= Algorythmo::AsyncDispatcher
      AsyncDispatcher.prepend(Algorythmo::AsyncDispatcher)
    end
  end

  # algorythmo: rebrand-m0 view_path overlay
  # Prepend the engine's app/views to the host view lookup path so our Liquid
  # mailer templates take precedence over the upstream Chatwoot ones.
  # Uses unshift (not push) so the engine path is searched FIRST, matching
  # the same priority model as the i18n overlay: engine wins over upstream.
  initializer 'algorythmo.prepend_view_path', before: :build_middleware_stack do |app|
    app.config.paths['app/views'].unshift(
      Algorythmo::Engine.root.join('app', 'views').to_s
    )
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
