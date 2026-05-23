# frozen_string_literal: true

# A.2 — Seed default CRM pipeline for every account.
# Creates 1 pipeline with 5 default stages per account, idempotently.
# Aging coefficients (D10): calibrated so the green/yellow/red chip activates at
# sensible wall-clock thresholds per stage urgency.
#
# Stage coefficients map to a 12h base unit (see LeadAgingChip formula):
#   ratio = seconds_in_stage / (12h * aging_coefficient)
#   ratio < 1 → green, < 2 → yellow, ≥ 2 → red
#
# Closed stages (won/lost) use 0.0 so the chip stays neutral — no aging alert
# makes sense once the deal is decided.
namespace :algorythmo do
  namespace :crm do
    DEFAULT_STAGES = [
      { name: 'Novo',             kind: :open, position: 0, aging_coefficient: 1.0 },
      { name: 'Qualificado',      kind: :open, position: 1, aging_coefficient: 4.0 },
      { name: 'Proposta',         kind: :open, position: 2, aging_coefficient: 7.0 },
      { name: 'Fechado ganho',    kind: :won,  position: 3, aging_coefficient: 0.0 },
      { name: 'Fechado perdido',  kind: :lost, position: 4, aging_coefficient: 0.0 }
    ].freeze

    desc 'Seed default CRM pipeline for all accounts (idempotent)'
    task seed_pipelines: :environment do
      Account.find_each do |account|
        seed_pipeline_for(account)
      end
    end

    desc 'Seed default CRM pipeline for a single account (ACCOUNT_ID=<id>)'
    task seed_pipeline_for_account: :environment do
      id = ENV.fetch('ACCOUNT_ID') { raise 'ACCOUNT_ID env var required' }
      account = Account.find(id)
      seed_pipeline_for(account)
    end

    def seed_pipeline_for(account)
      existing = Algorythmo::Pipeline.where(account: account).exists?
      if existing
        puts "[algorythmo:crm] Account #{account.id} already has a pipeline — skipping."
        return
      end

      pipeline = Algorythmo::Pipeline.create!(
        account: account,
        name: 'Pipeline Principal'
      )

      DEFAULT_STAGES.each do |attrs|
        Algorythmo::Stage.create!(
          pipeline: pipeline,
          name: attrs[:name],
          kind: attrs[:kind],
          position: attrs[:position],
          aging_coefficient: attrs[:aging_coefficient]
        )
      end

      puts "[algorythmo:crm] Seeded pipeline '#{pipeline.name}' for account #{account.id} " \
           "with #{DEFAULT_STAGES.size} stages."
    end
  end
end
