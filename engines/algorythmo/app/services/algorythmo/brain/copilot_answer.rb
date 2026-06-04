# frozen_string_literal: true

# Read-only consultant that answers an operator question grounded 100% in the brain.
#
# This is the operator's tool (the agent / Malu), NOT admin curation. It has NO
# tools, NO write path, NO access to conversations or the CRM. The ONLY thing it
# does is call `gbrain think --json` and map the result into a state machine. That
# read-only surface IS the security boundary (§4.4): even a successful prompt
# injection inside a captured document can only ever produce bad TEXT for an
# internal operator — there is no action it can trigger from here.
#
# State machine (plan §2.2, confirmed against the pinned gbrain SHA):
#
#   engine_unconfigured → synthesisOk == false (PRIMARY signal; a MISSING field is
#                         treated as false — defensive default). The LLM is off.
#                         HTTP 503. NEVER conflated with "I don't know" — that would
#                         lie to the operator (P1-2).
#   degraded            → a warning of type LLM_OUTPUT_NOT_JSON: synthesis ran but
#                         returned garbage. HTTP 200, "answer unavailable, try again".
#   ungrounded          → synthesisOk == true AND citations empty: the brain has no
#                         grounding for this answer. HTTP 200, "not in the Brain".
#                         The Copilot never invents.
#   grounded            → synthesisOk == true AND citations present. HTTP 200.
#
# We DELIBERATELY do NOT branch on the `NO_ANTHROPIC_API_KEY` warning literal: gbrain
# emits that generic warning even when running DeepSeek, so it is advisory noise, not
# a discriminant. `synthesisOk` is the single source of truth for "is the engine on".
module Algorythmo
  module Brain
    class CopilotAnswer
      STATE_GROUNDED            = 'grounded'
      STATE_UNGROUNDED          = 'ungrounded'
      STATE_ENGINE_UNCONFIGURED = 'engine_unconfigured'
      STATE_DEGRADED            = 'degraded'

      # gbrain warning emitted when the model returned non-JSON (dirty synthesis).
      DEGRADED_WARNING = 'LLM_OUTPUT_NOT_JSON'

      # @param account_id [Integer]
      # @param question [String] already validated (presence, length) by the caller.
      # @return [Hash] { state:, answer:, citations:, gaps:, model_used:, pages_gathered: }
      def self.call(account_id:, question:)
        new(account_id: account_id, question: question).call
      end

      def initialize(account_id:, question:)
        @account_id = account_id
        @question   = question
      end

      def call
        payload = Algorythmo::Brain::Client.new(@account_id).think(prompt: @question)
        build_result(payload)
      end

      private

      def build_result(payload)
        {
          state: resolve_state(payload),
          answer: payload['answer'].to_s,
          citations: normalize_citations(payload['citations']),
          gaps: Array(payload['gaps']),
          model_used: payload['modelUsed'],
          pages_gathered: payload['pagesGathered']
        }
      end

      # Order matters. `degraded` is checked FIRST: gbrain emits LLM_OUTPUT_NOT_JSON
      # together with synthesisOk=false (dirty synthesis), but product-wise that is a
      # transient "try again" (200), NOT "engine not configured" (503). Distinguishing
      # them is the whole point of P1-2 — don't tell the operator the engine is off
      # when the model merely burped garbage once.
      def resolve_state(payload)
        return STATE_DEGRADED            if degraded?(payload)
        return STATE_ENGINE_UNCONFIGURED unless synthesis_ok?(payload)

        normalize_citations(payload['citations']).any? ? STATE_GROUNDED : STATE_UNGROUNDED
      end

      # Defensive default: a missing/absent synthesisOk is treated as false. Only an
      # explicit boolean true counts as "engine ran".
      def synthesis_ok?(payload)
        payload['synthesisOk'] == true
      end

      def degraded?(payload)
        Array(payload['warnings']).include?(DEGRADED_WARNING)
      end

      def normalize_citations(citations)
        Array(citations).map do |citation|
          {
            page_slug: citation['page_slug'],
            row_num: citation['row_num'],
            citation_index: citation['citation_index']
          }
        end
      end
    end
  end
end
