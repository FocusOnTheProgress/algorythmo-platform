// algorythmo: PR7 — Copiloto service contract spec.
//
// Proves the thin transport normalises the four honest states, re-resolves the
// 503 engine_unconfigured as a STATE (not a thrown error), and classifies
// transport failures (429/422/401/403/5xx) by status — independent of the
// pt-BR string the backend sends.
import { describe, it, expect, vi, beforeEach } from 'vitest';

// axios is a global in the app (provided by a plugin). Stub it for the service.
const post = vi.fn();
vi.stubGlobal('axios', { post });

import {
  copilotService,
  COPILOT_STATES,
  COPILOT_ERRORS,
  COPILOT_MAX_QUESTION_LENGTH,
} from '../copilot.service';

const ACCOUNT_ID = 2;

function httpError(status, data) {
  const err = new Error(`HTTP ${status}`);
  err.response = { status, data };
  return err;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('copilotService.ask — 200 answer states', () => {
  it('normalises a grounded answer with citations', async () => {
    post.mockResolvedValue({
      data: {
        state: 'grounded',
        answer: 'Our return window is 30 days.',
        citations: [
          { page_slug: 'return-policy', row_num: 4, citation_index: 1 },
        ],
        gaps: [],
        model_used: 'deepseek-chat',
        pages_gathered: 3,
      },
    });

    const result = await copilotService.ask(ACCOUNT_ID, 'return policy?');

    expect(post).toHaveBeenCalledWith(
      `/algorythmo/api/v1/accounts/${ACCOUNT_ID}/brain/copilot/ask`,
      { question: 'return policy?' }
    );
    expect(result.state).toBe(COPILOT_STATES.GROUNDED);
    expect(result.answer).toBe('Our return window is 30 days.');
    expect(result.citations).toHaveLength(1);
    expect(result.citations[0].page_slug).toBe('return-policy');
    expect(result.modelUsed).toBe('deepseek-chat');
    expect(result.pagesGathered).toBe(3);
  });

  it('passes through an ungrounded answer (empty citations)', async () => {
    post.mockResolvedValue({
      data: { state: 'ungrounded', answer: '', citations: [], gaps: ['x'] },
    });
    const result = await copilotService.ask(ACCOUNT_ID, 'q');
    expect(result.state).toBe(COPILOT_STATES.UNGROUNDED);
    expect(result.citations).toEqual([]);
  });

  it('passes through a degraded answer', async () => {
    post.mockResolvedValue({ data: { state: 'degraded', answer: '' } });
    const result = await copilotService.ask(ACCOUNT_ID, 'q');
    expect(result.state).toBe(COPILOT_STATES.DEGRADED);
  });

  it('defaults an unknown/missing state to degraded (never invents grounded)', async () => {
    post.mockResolvedValue({ data: { answer: 'orphan text' } });
    const result = await copilotService.ask(ACCOUNT_ID, 'q');
    expect(result.state).toBe(COPILOT_STATES.DEGRADED);
  });

  it('coerces a non-string answer to an empty string (template safety)', async () => {
    post.mockResolvedValue({
      data: { state: 'grounded', answer: { evil: '<script>' } },
    });
    const result = await copilotService.ask(ACCOUNT_ID, 'q');
    expect(result.answer).toBe('');
  });
});

describe('copilotService.ask — engine_unconfigured (503)', () => {
  it('re-resolves a 503 as the engine_unconfigured STATE, not a thrown error', async () => {
    post.mockRejectedValue(
      httpError(503, {
        state: 'engine_unconfigured',
        error: 'Motor de IA não configurado',
      })
    );
    const result = await copilotService.ask(ACCOUNT_ID, 'q');
    expect(result.state).toBe(COPILOT_STATES.ENGINE_UNCONFIGURED);
  });

  it('treats a bare 503 (no body) as engine_unconfigured', async () => {
    post.mockRejectedValue(httpError(503, undefined));
    const result = await copilotService.ask(ACCOUNT_ID, 'q');
    expect(result.state).toBe(COPILOT_STATES.ENGINE_UNCONFIGURED);
  });
});

describe('copilotService.ask — transport errors', () => {
  it('classifies 429 as rate_limited', async () => {
    post.mockRejectedValue(httpError(429, { error: 'Muitas perguntas' }));
    await expect(copilotService.ask(ACCOUNT_ID, 'q')).rejects.toMatchObject({
      kind: COPILOT_ERRORS.RATE_LIMITED,
      status: 429,
    });
  });

  it('classifies 422 as invalid', async () => {
    post.mockRejectedValue(httpError(422, { error: 'Pergunta inválida' }));
    await expect(copilotService.ask(ACCOUNT_ID, 'q')).rejects.toMatchObject({
      kind: COPILOT_ERRORS.INVALID,
      status: 422,
    });
  });

  it('classifies 401 and 403 as forbidden', async () => {
    post.mockRejectedValue(httpError(401, {}));
    await expect(copilotService.ask(ACCOUNT_ID, 'q')).rejects.toMatchObject({
      kind: COPILOT_ERRORS.FORBIDDEN,
    });
    post.mockRejectedValue(httpError(403, {}));
    await expect(copilotService.ask(ACCOUNT_ID, 'q')).rejects.toMatchObject({
      kind: COPILOT_ERRORS.FORBIDDEN,
    });
  });

  it('classifies a 502/network failure as unknown', async () => {
    post.mockRejectedValue(httpError(502, { error: 'bad gateway' }));
    await expect(copilotService.ask(ACCOUNT_ID, 'q')).rejects.toMatchObject({
      kind: COPILOT_ERRORS.UNKNOWN,
    });
  });
});

describe('copilotService constants', () => {
  it('exposes the 2000-char question limit', () => {
    expect(COPILOT_MAX_QUESTION_LENGTH).toBe(2000);
  });
});
