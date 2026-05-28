# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Algorythmo::FeatureFlagBits do
  let(:account) { create(:account) }

  describe 'CUT_FLAG_NAMES' do
    # algorythmo: M2-a added positions 17–26 (top-level + sector cuts).
    # algorythmo: M2-c added positions 27–28 (reports_labels / reports_inbox).
    # algorythmo: M2-d added positions 29–34 (Marketing per-sub-tab cuts).
    # algorythmo: M2-e added positions 35–47 (Operations/Procurement/Administration
    #   per-sub-tab cuts).
    # algorythmo: M2-f added positions 48–57 (Finance 48–53 + HR 54–57 per-sub-tab cuts).
    # ORDER IS IMMUTABLE — reordering corrupts existing bigint data.
    it 'contains exactly 57 flags' do
      expect(described_class::CUT_FLAG_NAMES.size).to eq(57)
    end

    it 'is frozen' do
      expect(described_class::CUT_FLAG_NAMES).to be_frozen
    end

    # algorythmo: M6.1-a — reports_commercial at position 16.
    describe 'reports_commercial (M6.1-a, position 16)' do
      it 'is in CUT_FLAG_NAMES' do
        expect(described_class::CUT_FLAG_NAMES).to include('reports_commercial')
      end

      it 'occupies bit-position 16 (array index 15)' do
        expect(described_class::CUT_FLAG_NAMES.index('reports_commercial') + 1).to eq(16)
      end

      it 'defaults to false on a new account (overlay visible by default)' do
        expect(account.algorythmo_cut_enabled?('reports_commercial')).to be false
      end

      it 'is included in all_algorythmo_cut_flags' do
        expect(account.all_algorythmo_cut_flags).to include('reports_commercial' => false)
      end
    end

    # algorythmo: M2-c — reports_labels / reports_inbox sidebar-only cuts.
    # Positions 27/28 must stay fixed — any future flag appends AFTER these.
    describe 'reports_labels (M2-c, position 27)' do
      it 'occupies bit-position 27 (array index 26)' do
        expect(described_class::CUT_FLAG_NAMES.index('reports_labels') + 1).to eq(27)
      end

      it 'defaults to false on a new account (Label report tab visible by default)' do
        expect(account.algorythmo_cut_enabled?('reports_labels')).to be false
      end
    end

    describe 'reports_inbox (M2-c, position 28)' do
      it 'occupies bit-position 28 (array index 27)' do
        expect(described_class::CUT_FLAG_NAMES.index('reports_inbox') + 1).to eq(28)
      end

      it 'defaults to false on a new account (Inbox report tab visible by default)' do
        expect(account.algorythmo_cut_enabled?('reports_inbox')).to be false
      end
    end

    # algorythmo: M2-d — Marketing per-sub-tab cuts (positions 29–34).
    # Any future flag appends AFTER these — order stays fixed.
    describe 'Marketing sub-tab cuts (M2-d, positions 29–34)' do
      {
        'sector_marketing_branding' => 29,
        'sector_marketing_campanhas' => 30,
        'sector_marketing_redes_sociais' => 31,
        'sector_marketing_trafego' => 32,
        'sector_marketing_crm' => 33,
        'sector_marketing_retencao' => 34
      }.each do |flag, position|
        it "#{flag} occupies bit-position #{position} (array index #{position - 1})" do
          expect(described_class::CUT_FLAG_NAMES.index(flag) + 1).to eq(position)
        end

        it "#{flag} defaults to false on a new account (sub-tab visible by default)" do
          expect(account.algorythmo_cut_enabled?(flag)).to be false
        end
      end
    end

    # algorythmo: M2-e — Operations/Procurement/Administration per-sub-tab cuts
    # (positions 35–47). Any future flag appends AFTER these — order stays fixed.
    describe 'Operations/Procurement/Administration sub-tab cuts (M2-e, positions 35–47)' do
      {
        'sector_operations_estoque' => 35,
        'sector_operations_reposicao' => 36,
        'sector_operations_logistica' => 37,
        'sector_operations_organizacao' => 38,
        'sector_operations_entrega' => 39,
        'sector_operations_expedicao' => 40,
        'sector_procurement_fornecedores' => 41,
        'sector_procurement_reposicao' => 42,
        'sector_procurement_custo' => 43,
        'sector_procurement_giro' => 44,
        'sector_administration_estrategia' => 45,
        'sector_administration_metas' => 46,
        'sector_administration_indicadores' => 47
      }.each do |flag, position|
        it "#{flag} occupies bit-position #{position} (array index #{position - 1})" do
          expect(described_class::CUT_FLAG_NAMES.index(flag) + 1).to eq(position)
        end

        it "#{flag} defaults to false on a new account (sub-tab visible by default)" do
          expect(account.algorythmo_cut_enabled?(flag)).to be false
        end
      end
    end

    # algorythmo: M2-f — Finance + HR per-sub-tab cuts (positions 48–57).
    # Finance 48–53, HR 54–57. Appended after the M2-e block; order immutable.
    describe 'Finance + HR sub-tab cuts (M2-f, positions 48–57)' do
      {
        'sector_finance_a_pagar' => 48,
        'sector_finance_a_receber' => 49,
        'sector_finance_fluxo' => 50,
        'sector_finance_margem' => 51,
        'sector_finance_lucro' => 52,
        'sector_finance_planejamento' => 53,
        'sector_hr_contratacao' => 54,
        'sector_hr_treinamento' => 55,
        'sector_hr_cultura' => 56,
        'sector_hr_produtividade' => 57
      }.each do |flag, position|
        it "#{flag} occupies bit-position #{position} (array index #{position - 1})" do
          expect(described_class::CUT_FLAG_NAMES.index(flag) + 1).to eq(position)
        end

        it "#{flag} defaults to false on a new account (sub-tab visible by default)" do
          expect(account.algorythmo_cut_enabled?(flag)).to be false
        end
      end
    end
  end

  describe '#algorythmo_cut_enabled?' do
    it 'returns false for all 57 flags on a fresh account' do
      described_class::CUT_FLAG_NAMES.each do |flag|
        expect(account.algorythmo_cut_enabled?(flag)).to(
          be(false),
          "expected algorythmo_cut_#{flag} to be false on a new account"
        )
      end
    end

    it 'returns true after the flag is set on the account' do
      account.algorythmo_cut_campaigns = true
      account.save!
      expect(account.reload.algorythmo_cut_enabled?('campaigns')).to be true
    end

    it 'returns false again after disabling the flag' do
      account.algorythmo_cut_campaigns = true
      account.save!
      account.algorythmo_cut_campaigns = false
      account.save!
      expect(account.reload.algorythmo_cut_enabled?('campaigns')).to be false
    end

    it 'accepts symbols' do
      expect(account.algorythmo_cut_enabled?(:campaigns)).to be false
    end

    it 'accepts the algorythmo_ prefix' do
      expect(account.algorythmo_cut_enabled?('algorythmo_campaigns')).to be false
    end

    it 'accepts the algorythmo_cut_ prefix' do
      expect(account.algorythmo_cut_enabled?('algorythmo_cut_campaigns')).to be false
    end

    it 'returns false for unknown flag names' do
      expect(account.algorythmo_cut_enabled?('nonexistent')).to be false
    end

    it 'is independent per flag — setting one does not affect another' do
      account.algorythmo_cut_campaigns = true
      account.save!
      expect(account.reload.algorythmo_cut_enabled?('macros')).to be false
    end

    it 'is independent per account' do
      other_account = create(:account)
      account.algorythmo_cut_campaigns = true
      account.save!
      expect(other_account.algorythmo_cut_enabled?('campaigns')).to be false
    end
  end

  describe '#all_algorythmo_cut_flags' do
    it 'returns a hash with all 57 flags' do
      result = account.all_algorythmo_cut_flags
      expect(result.keys).to match_array(described_class::CUT_FLAG_NAMES)
    end

    it 'returns all false on a fresh account' do
      expect(account.all_algorythmo_cut_flags.values).to all(be false)
    end
  end
end
