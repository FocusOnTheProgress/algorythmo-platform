/* global axios */
// algorythmo: PR7 — Copiloto (operator knowledge consultant) service layer.
//
// Single endpoint, read-only: POST .../brain/copilot/ask { question } → an
// answer grounded 100% in the company Brain. The backend (PR #135) owns the
// state machine; this layer is a thin transport that normalises the contract
// into a stable shape the chat UI can switch on, and maps transport errors
// (429/422/503/401/403) onto the same honest-state vocabulary.
//
// IMPORTANT — anti-XSS boundary: this layer NEVER renders. It returns the raw
// `answer` STRING untouched; the component renders it as escaped text only
// (never v-html). Keeping markup-safety in the view, not here, means there is
// exactly one place to audit.

// The four honest answer states the backend returns on a 200 (and 503 for
// engine_unconfigured). The UI renders a visually distinct surface per state.
export const COPILOT_STATES = Object.freeze({
  GROUNDED: 'grounded',
  UNGROUNDED: 'ungrounded',
  DEGRADED: 'degraded',
  ENGINE_UNCONFIGURED: 'engine_unconfigured',
});

// Transport-level outcomes that are NOT part of the answer state machine but
// must still be surfaced honestly (rate-limit, invalid question, auth).
export const COPILOT_ERRORS = Object.freeze({
  RATE_LIMITED: 'rate_limited', // 429 — too many questions
  INVALID: 'invalid', // 422 — empty / > 2000 chars
  ENGINE_UNCONFIGURED: COPILOT_STATES.ENGINE_UNCONFIGURED, // 503
  FORBIDDEN: 'forbidden', // 401 / 403
  UNKNOWN: 'unknown', // 5xx / network — generic retry
});

// Client-side mirror of the backend's hard limit (P1: 422 on > 2000). Kept here
// so the composer can validate inline before a round-trip.
export const COPILOT_MAX_QUESTION_LENGTH = 2000;

const VALID_STATES = new Set(Object.values(COPILOT_STATES));

function copilotBase(accountId) {
  return `/algorythmo/api/v1/accounts/${accountId}/brain/copilot`;
}

// Normalise the raw 200 body into a predictable shape. A missing/unknown
// `state` is treated as `degraded` (defensive default — the same posture the
// backend takes for an absent synthesisOk): never invent a grounded answer.
function normalizeAnswer(data = {}) {
  const state = VALID_STATES.has(data.state)
    ? data.state
    : COPILOT_STATES.DEGRADED;
  return {
    state,
    // Raw LLM text — rendered ESCAPED by the view. Coerced to a string so the
    // template never receives an object/HTML node.
    answer: typeof data.answer === 'string' ? data.answer : '',
    citations: Array.isArray(data.citations) ? data.citations : [],
    gaps: Array.isArray(data.gaps) ? data.gaps : [],
    modelUsed: data.model_used ?? null,
    pagesGathered: data.pages_gathered ?? null,
  };
}

// Map a transport error onto a CopilotError the UI can switch on. The backend
// sends a pt-BR `error` string; we keep it for display but classify by status
// so copy/treatment is consistent even if the string changes upstream.
function toCopilotError(err) {
  const status = err?.response?.status;
  const serverMessage = err?.response?.data?.error;

  let kind = COPILOT_ERRORS.UNKNOWN;
  if (status === 429) kind = COPILOT_ERRORS.RATE_LIMITED;
  else if (status === 422) kind = COPILOT_ERRORS.INVALID;
  else if (status === 503) kind = COPILOT_ERRORS.ENGINE_UNCONFIGURED;
  else if (status === 401 || status === 403) kind = COPILOT_ERRORS.FORBIDDEN;

  const error = new Error(serverMessage || `copilot_${kind}`);
  error.kind = kind;
  error.status = status;
  error.serverMessage = serverMessage;
  return error;
}

export const copilotService = {
  // Ask the Copiloto a question. Resolves with a normalised answer (grounded /
  // ungrounded / degraded / engine_unconfigured). Rejects with a classified
  // CopilotError (.kind) on transport failure.
  //
  // engine_unconfigured arrives as a 503 — axios rejects it — so we catch it
  // and RE-RESOLVE it as an answer state (it is a system state, not a thrown
  // error to the chat log). Every other error rejects.
  async ask(accountId, question) {
    try {
      const { data } = await axios.post(`${copilotBase(accountId)}/ask`, {
        question,
      });
      return normalizeAnswer(data);
    } catch (err) {
      // 503 with the engine_unconfigured contract → resolve as that state so
      // the chat shows the distinct "engine not configured" surface, not a
      // generic error toast.
      if (err?.response?.status === 503) {
        const body = err?.response?.data ?? {};
        return normalizeAnswer({
          ...body,
          state: COPILOT_STATES.ENGINE_UNCONFIGURED,
        });
      }
      throw toCopilotError(err);
    }
  },
};
