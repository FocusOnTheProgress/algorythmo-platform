require 'rails_helper'

RSpec.describe Algorythmo::FeatureGate do
  let(:account) { create(:account) }

  # All algorythmo_* flags default to false (fail-closed by features.yml).
  describe '.enabled?' do
    it 'returns false for a flag that is disabled by default' do
      expect(described_class.enabled?(account, 'campaigns')).to be false
    end

    it 'returns false for all 13 CUT flags by default' do
      %w[
        campaigns help_center sla audit_logs custom_roles
        security_settings billing_settings agent_bots macros
        dashboard_apps advanced_assignment reports_bot
        conversation_workflow
      ].each do |flag|
        expect(described_class.enabled?(account, flag)).to(
          be(false),
          "expected algorythmo_#{flag} to be false by default"
        )
      end
    end

    it 'returns true after enabling the flag on the account' do
      account.enable_features!('algorythmo_campaigns')
      expect(described_class.enabled?(account, 'campaigns')).to be true
    end

    it 'returns false again after disabling the flag' do
      account.enable_features!('algorythmo_campaigns')
      account.disable_features!('algorythmo_campaigns')
      expect(described_class.enabled?(account, 'campaigns')).to be false
    end

    it 'accepts symbol flag names' do
      expect(described_class.enabled?(account, :campaigns)).to be false
    end

    it 'is independent per account' do
      other_account = create(:account)
      account.enable_features!('algorythmo_campaigns')
      expect(described_class.enabled?(other_account, 'campaigns')).to be false
    end
  end
end
