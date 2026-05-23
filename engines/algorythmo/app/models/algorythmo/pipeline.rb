# frozen_string_literal: true

module Algorythmo
  # A Pipeline groups Stages into a named funnel.
  # MVP: one pipeline per account (enforced by seed). Multi-pipeline is §7.
  class Pipeline < ApplicationRecord
    belongs_to :account
    has_many :stages, -> { order(:position) }, class_name: 'Algorythmo::Stage',
                                               foreign_key: :pipeline_id,
                                               inverse_of: :pipeline,
                                               dependent: :destroy

    validates :name, presence: true

    # F3 — cached lookup. The cache key incorporates updated_at (via cache_key_with_version)
    # so any change to the pipeline record or any of its stages (via touch: true) auto-busts
    # the entry without a manual invalidation step.
    #
    # TTL of 1 hour is a safety net: the primary invalidation path is the version key change.
    def self.cached_default_for(account)
      pipeline = where(account: account).order(:id).first
      return nil unless pipeline

      Rails.cache.fetch(
        "algorythmo:pipeline:default:#{account.id}/#{pipeline.cache_key_with_version}",
        expires_in: 1.hour
      ) do
        pipeline.stages.load # eager-load stages so callers don't trigger N+1
        pipeline
      end
    end
  end
end
