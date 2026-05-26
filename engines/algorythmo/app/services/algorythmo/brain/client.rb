# frozen_string_literal: true

# Thin wrapper over the GBrain CLI subprocess.
#
# Interface frozen in PR M3-1. Full subprocess body (Open3.popen3) lands in PR M3-2.
#
# Day-1: account_id is accepted but ignored — there is a single brain at ~/.gbrain/
#   (GBrain upstream default). No --dir flag (does not exist upstream per premise audit v4).
#
# Day-M3.5: account_id → database_url resolved via AccountBrainRegistry
#   (table `algorythmo_account_brains`, provisioned per ADR-0014).
#   Brain::Client.new(account_id) will pass GBRAIN_DATABASE_URL via Open3 env hash,
#   isolating each account's brain at the DB level without per-tenant filesystem paths.
#
# All write methods (capture, export) MUST be wrapped by WriteLock.with_lock.
# Read methods (search, think, stats) do NOT acquire the lock.
module Algorythmo
  module Brain
    class Client
      # @param account_id [Integer] Chatwoot account ID.
      #   Day-1: ignored (single brain). Day-M3.5: used to resolve GBRAIN_DATABASE_URL.
      def initialize(account_id)
        @account_id = account_id
      end

      # Ingest a markdown file into the brain.
      # MUST be called inside WriteLock.with_lock { }.
      # @param file [String] absolute path to the markdown file to capture
      def capture(file:)
        raise NotImplementedError, 'Brain::Client#capture — body in PR M3-2'
      end

      # Search the brain for pages matching query.
      # @param query [String]
      # @param limit [Integer] max results (default upstream)
      # @return [Array<Hash>]
      def search(query:, limit: 10)
        raise NotImplementedError, 'Brain::Client#search — body in PR M3-2'
      end

      # Synthesise an answer using the brain's knowledge.
      # @param prompt [String]
      # @param context [String, nil] optional extra context
      # @return [Hash] { answer:, citations: [] }
      def think(prompt:, context: nil)
        raise NotImplementedError, 'Brain::Client#think — body in PR M3-2'
      end

      # Export the full brain to a directory or file.
      # MUST be called inside WriteLock.with_lock { } (defensive against concurrent capture).
      # @param out [String] output path
      def export(out:)
        raise NotImplementedError, 'Brain::Client#export — body in PR M3-2'
      end

      # Return usage statistics from the brain.
      # @return [Hash]
      def stats
        raise NotImplementedError, 'Brain::Client#stats — body in PR M3-2'
      end
    end
  end
end
