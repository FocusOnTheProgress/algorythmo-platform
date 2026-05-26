# frozen_string_literal: true

# Schedules Algorythmo::Brain::IngestionWorker to run daily at 02:00 UTC.
#
# Day-1: targets a single account — the founder's account, resolved from
# ENV['ALGORYTHMO_PRIMARY_ACCOUNT_ID']. Fail-closed: if the env var is unset,
# logs a warning and does NOT schedule (prevent nil account_id in jobs).
#
# M3.5: iterate over AccountBrainRegistry accounts and schedule one job each.
#
# Timezone note: 02:00 UTC is a low-traffic window Day-1. When M3.5 generalises
# to per-tenant timezone-aware scheduling, this file is the single place to update.
Rails.application.reloader.to_prepare do
  next unless defined?(Sidekiq) && Sidekiq.server?

  primary_account_id = ENV['ALGORYTHMO_PRIMARY_ACCOUNT_ID'].presence

  unless primary_account_id
    Rails.logger.warn(
      '[Algorythmo] ALGORYTHMO_PRIMARY_ACCOUNT_ID not set — ' \
      'Brain ingestion cron will NOT be scheduled. ' \
      'Set this env var to enable nightly ingestion.'
    )
    next
  end

  Sidekiq::Cron::Job.find_or_create!(
    name:  'algorythmo_brain_ingestion_daily',
    cron:  '0 2 * * *',
    class: 'Algorythmo::Brain::IngestionWorker',
    args:  [Integer(primary_account_id)],
    queue: 'default'
  )
end
