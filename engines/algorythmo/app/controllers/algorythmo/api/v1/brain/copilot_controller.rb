# frozen_string_literal: true

# POST /brain/copilot/ask
#
# Read-only knowledge consultant for the OPERATOR (the agent / Malu) — NOT admin
# curation. It inherits the full Brain auth chain (token → account membership →
# algorythmo_crm gate → tenant fail-closed) but DELIBERATELY does NOT add
# check_admin_authorization?: asking a question is an operator action, while
# uploading/curating the brain is the admin action. Agents may ask.
#
# This controller has exactly ONE action and ZERO write paths. There is no create,
# update, destroy, capture, or any method that mutates the brain, a conversation,
# or the CRM. That read-only surface is the real security boundary (§4.4): the
# answer is plain text the frontend escapes (Fatia 7), and even a prompt-injected
# document can only produce bad text — never an action.
#
# Errors from Brain::Client are mapped to typed 502/503 — NEVER a bare 500.
class Algorythmo::Api::V1::Brain::CopilotController < Algorythmo::Api::V1::Brain::BaseController
  MAX_QUESTION_LENGTH = 2000

  def ask
    question = params[:question].to_s.strip
    return render_invalid_question if question.empty? || question.length > MAX_QUESTION_LENGTH
    return render_rate_limited unless within_rate_limit?

    result = Algorythmo::Brain::ConcurrencySemaphore.with_slot do
      Algorythmo::Brain::CopilotAnswer.call(account_id: current_account.id, question: question)
    end

    render_answer(result)
  rescue Algorythmo::Brain::ConcurrencySemaphore::Saturated
    render_saturated
  rescue Algorythmo::Brain::Client::TimeoutError
    render json: { error: 'O Cérebro demorou para responder. Tente novamente.' }, status: :gateway_timeout
  rescue Algorythmo::Brain::Client::SubprocessError
    render json: { error: 'O motor do Cérebro está indisponível no momento.' }, status: :bad_gateway
  end

  private

  def within_rate_limit?
    Algorythmo::Brain::CopilotRateLimiter.allow?(
      account_id: current_account.id,
      user_id: current_user.id
    )
  end

  # The state machine drives the HTTP status. engine_unconfigured is the only
  # non-200: it signals "the LLM is off", which is operationally distinct from
  # "I don't know" (ungrounded, a legitimate 200 answer).
  def render_answer(result)
    if result[:state] == Algorythmo::Brain::CopilotAnswer::STATE_ENGINE_UNCONFIGURED
      return render json: copilot_body(result), status: :service_unavailable
    end

    render json: copilot_body(result), status: :ok
  end

  def copilot_body(result)
    {
      state: result[:state],
      answer: result[:answer],
      citations: result[:citations],
      gaps: result[:gaps],
      model_used: result[:model_used],
      pages_gathered: result[:pages_gathered]
    }
  end

  def render_invalid_question
    render json: { error: "A pergunta é obrigatória e deve ter no máximo #{MAX_QUESTION_LENGTH} caracteres." },
           status: :unprocessable_entity
  end

  def render_rate_limited
    render json: { error: 'Muitas perguntas em pouco tempo. Aguarde um instante e tente novamente.' },
           status: :too_many_requests
  end

  def render_saturated
    render json: { error: 'Muitas perguntas ao mesmo tempo. Tente em instantes.' },
           status: :too_many_requests
  end
end
