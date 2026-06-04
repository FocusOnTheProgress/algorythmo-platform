// algorythmo: brain.service — spec (plan 0012).
//
// Locks the contract the screen depends on:
//   - the four reads/writes hit the right URLs with the right params/payloads;
//   - the OLD 501→fixture fallback is GONE: an error (including 501) now BUBBLES
//     so empty is honestly empty, never a fantasy fixture.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { brainService } from '../brain.service';

const get = vi.fn();
const post = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  global.axios = { get, post };
});

describe('brain.service — reads', () => {
  it('fetchCompiledTruth GETs the compiled_truth endpoint', async () => {
    get.mockResolvedValue({ data: { pages: 1, edges: 2 } });
    const data = await brainService.fetchCompiledTruth(2);
    expect(get).toHaveBeenCalledWith(
      '/algorythmo/api/v1/accounts/2/brain/compiled_truth'
    );
    expect(data).toEqual({ pages: 1, edges: 2 });
  });

  it('fetchDocuments GETs documents with pagination params', async () => {
    get.mockResolvedValue({ data: { documents: [], meta: {} } });
    await brainService.fetchDocuments(2, { page: 3, perPage: 50 });
    expect(get).toHaveBeenCalledWith(
      '/algorythmo/api/v1/accounts/2/brain/documents',
      {
        params: { page: 3, per_page: 50 },
      }
    );
  });

  it('fetchTimeline GETs the timeline with a page param', async () => {
    get.mockResolvedValue({ data: { data: [], meta: {} } });
    await brainService.fetchTimeline(2);
    expect(get).toHaveBeenCalledWith(
      '/algorythmo/api/v1/accounts/2/brain/timeline',
      {
        params: { page: 1 },
      }
    );
  });
});

describe('brain.service — writes', () => {
  it('postDocument sends multipart form data', async () => {
    post.mockResolvedValue({ data: { id: 1, status: 'pending' } });
    const file = new File(['x'], 'a.pdf', { type: 'application/pdf' });
    const data = await brainService.postDocument(2, {
      file,
      category: 'policies',
    });
    const [url, form, opts] = post.mock.calls[0];
    expect(url).toBe('/algorythmo/api/v1/accounts/2/brain/documents');
    expect(form).toBeInstanceOf(FormData);
    expect(form.get('category')).toBe('policies');
    expect(opts.headers['Content-Type']).toBe('multipart/form-data');
    expect(data).toEqual({ id: 1, status: 'pending' });
  });

  it('postAdjustment posts content (and title only when present)', async () => {
    post.mockResolvedValue({ data: { id: 2 } });
    await brainService.postAdjustment(2, { content: 'rule', title: 'T' });
    expect(post).toHaveBeenCalledWith(
      '/algorythmo/api/v1/accounts/2/brain/adjustments',
      {
        content: 'rule',
        title: 'T',
      }
    );

    post.mockClear();
    await brainService.postAdjustment(2, { content: 'rule' });
    expect(post).toHaveBeenCalledWith(
      '/algorythmo/api/v1/accounts/2/brain/adjustments',
      {
        content: 'rule',
      }
    );
  });
});

describe('brain.service — NO fixture fallback (honest empty)', () => {
  it('bubbles a 501 instead of returning a fixture', async () => {
    get.mockRejectedValue({ response: { status: 501 } });
    await expect(brainService.fetchCompiledTruth(2)).rejects.toMatchObject({
      response: { status: 501 },
    });
  });

  it('bubbles auth/other errors untouched', async () => {
    get.mockRejectedValue({ response: { status: 403 } });
    await expect(brainService.fetchTimeline(2)).rejects.toMatchObject({
      response: { status: 403 },
    });
  });
});
