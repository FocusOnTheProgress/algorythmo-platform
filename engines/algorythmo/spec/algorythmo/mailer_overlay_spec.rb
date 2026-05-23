# frozen_string_literal: true

require 'rails_helper'

# M0.5.3 — Mailer Liquid overlay
#
# Verifies that the Algorythmo OS engine view path takes priority over the
# upstream Chatwoot mailer templates. The three compliance mailer templates
# must render without any visible "Chatwoot" brand string.
#
# Mechanism: engines/algorythmo/lib/algorythmo/engine.rb installs an initializer
# that prepends engines/algorythmo/app/views to the Rails view lookup path.
# Rails ActionView (and the Liquid renderer) will pick up our templates first.
#
# Note: The mailers use Liquid (not ERB). To test rendering without a live Rails
# stack, we read and assert the raw template files. The engine overlay is the
# file on disk — if the file exists in the engine path and does not contain
# "Chatwoot", the view_path initializer guarantees it will win at runtime.
RSpec.describe 'M0 rebrand: mailer Liquid template overlay', type: :sanity do
  ENGINE_VIEWS_ROOT = Algorythmo::Engine.root.join(
    'app', 'views', 'mailers', 'administrator_notifications'
  ).freeze

  HOST_VIEWS_ROOT = Rails.root.join(
    'app', 'views', 'mailers', 'administrator_notifications'
  ).freeze

  OVERLAY_TEMPLATES = [
    'account_compliance_mailer/account_deleted.liquid',
    'account_notification_mailer/account_deletion_for_inactivity.liquid',
    'account_notification_mailer/account_deletion_user_initiated.liquid',
  ].freeze

  shared_examples 'a rebranded mailer template' do |relative_path|
    let(:engine_template) { ENGINE_VIEWS_ROOT.join(relative_path) }
    let(:host_template)   { HOST_VIEWS_ROOT.join(relative_path) }
    let(:content)         { engine_template.read }

    it 'has an engine overlay file' do
      expect(engine_template).to exist
    end

    it 'host template still contains "Chatwoot" (proving overlay is needed)' do
      # Validates our assumption: the upstream file hasn't been rebranded already.
      # If this fails, the overlay is redundant (good problem to have but track it).
      expect(host_template.read).to include('Chatwoot')
    end

    it 'engine overlay does not contain "Chatwoot"' do
      expect(content).not_to include('Chatwoot')
    end

    it 'engine overlay mentions "Algorythmo OS"' do
      expect(content).to include('Algorythmo OS')
    end

    it 'engine overlay preserves Liquid variable placeholders' do
      # At minimum, one Liquid tag must survive — templates are not static.
      expect(content).to match(/\{\{.*?\}\}/)
    end
  end

  OVERLAY_TEMPLATES.each do |path|
    describe path do
      include_examples 'a rebranded mailer template', path
    end
  end

  describe 'view path priority' do
    it 'engine view path is prepended before host view path' do
      # Confirm the initializer ran: engine path should appear before host path
      # in the app view paths.
      engine_views = Algorythmo::Engine.root.join('app', 'views').to_s
      host_views = Rails.root.join('app', 'views').to_s

      paths = Rails.application.config.paths['app/views'].to_a
      engine_index = paths.index(engine_views)
      host_index   = paths.index(host_views)

      expect(engine_index).to be < host_index,
        "Expected engine views (#{engine_views}) to precede host views (#{host_views}) " \
        "in Rails view lookup path.\n\nActual order:\n#{paths.join("\n")}"
    end
  end
end
