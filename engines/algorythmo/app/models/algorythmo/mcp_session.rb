# frozen_string_literal: true

# Source-of-truth for MCP stdio bearer tokens (D-A5).
#
# Design constraints:
#   - Raw token is NEVER stored here; only the SHA-256 digest (token_hash).
#   - NO default_scope — explicit scopes used everywhere (D-A8).
#   - TTL 8h sliding: touch_usage! renews expires_at on each per-call validation.
#   - account_id is scaffold M3.5 — Day-1 is always the single founder account.
class Algorythmo::McpSession < ApplicationRecord
  belongs_to :user
  belongs_to :account

  validates :token_hash, presence: true, uniqueness: true
  validates :scope, presence: true
  validates :expires_at, presence: true

  # Active sessions: not revoked AND not expired.
  # Used for per-call DB lookup and for bulk-revocation on logout.
  scope :active, -> { where(revoked_at: nil).where('expires_at > ?', Time.current) }

  # Revokes this session immediately.
  # The Redis cache entry may survive up to 5min (D-A5 — founder accepted this window).
  def revoke!
    update!(revoked_at: Time.current)
  end

  # Extends TTL by 8h from now and records last_used_at timestamp.
  # Called by McpTokenValidator on every successful per-call validation.
  # No-op if the session is no longer active (expired or revoked) — guards
  # against a race where validation succeeded on Redis hit but DB record has
  # since been revoked before this write.
  def touch_usage!
    return unless active?

    update!(
      expires_at: 8.hours.from_now,
      last_used_at: Time.current
    )
  end

  private

  def active?
    revoked_at.nil? && expires_at > Time.current
  end
end
