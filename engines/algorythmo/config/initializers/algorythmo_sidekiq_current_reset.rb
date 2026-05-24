# frozen_string_literal: true

# Resets Chatwoot's Current module (lib/current.rb) around every Sidekiq job.
#
# WHY THIS EXISTS — adversarial review M1-C PR #52 (C1'):
# Chatwoot's host Current module uses thread_mattr_accessor, NOT
# ActiveSupport::CurrentAttributes. Unlike CurrentAttributes, thread_mattr_accessor
# does NOT automatically reset between Sidekiq jobs that share a thread.
#
# Concrete failure mode without this middleware:
#   1. Sidekiq thread runs JobA → sets Current.user = Alice (legitimately).
#   2. JobA forgets to call Current.reset on exit (only BulkActionsJob does today).
#   3. Same thread picks up EventDispatcherJob carrying a message.created event
#      from a totally unrelated Contact (Bob's WhatsApp).
#   4. Algorythmo::CrmListener creates Bob's lead and calls
#      StageHistoryRecorder.record_creation(lead).
#   5. Recorder reads Current.user → Alice → writes StageHistory(actor='user',
#      actor_id=Alice.id) — Alice is wrongly credited for Bob's lead, with
#      downstream effects on dashboards, commission, attribution (M3).
#
# This middleware provides the safety net thread_mattr_accessor lacks. It runs
# globally (Sidekiq server middleware is global by design) but is strictly
# defensive: any host job that legitimately needs Current.user/account/etc set
# MUST set them itself at the top of #perform (the existing pattern, see
# app/jobs/bulk_actions_job.rb:12). The middleware never overrides a job's own
# Current setup — it only cleans up state leaked between jobs.
#
# Why both leading and trailing reset:
#   - Leading: defends against the previous job on this thread that did not reset.
#   - Trailing (ensure): defends downstream — the next job's leading reset would
#     catch it anyway, but resetting on exit means heap references are released
#     promptly, reducing the risk of holding stale User objects in memory.
module Algorythmo
  module Sidekiq
    class CurrentResetMiddleware
      def call(_worker, _job, _queue)
        ::Current.reset
        yield
      ensure
        ::Current.reset
      end
    end
  end
end

# Register the middleware with the Sidekiq server chain. Client-side does not
# need it (clients enqueue, they don't execute jobs).
if defined?(::Sidekiq)
  ::Sidekiq.configure_server do |config|
    config.server_middleware do |chain|
      chain.add Algorythmo::Sidekiq::CurrentResetMiddleware
    end
  end
end
