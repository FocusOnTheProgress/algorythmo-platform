/* global axios */
// algorythmo: Brain service layer (plan 0012 — frontend that consumes the REAL
// motor endpoints).
//
// The compiled_truth / timeline / documents / snapshots controllers now return
// 200 with real data (PRs #130/#131/#132/#133). The old 501→fixture fallback —
// which made an empty brain LOOK full with demonstration data — is GONE. That
// fixture was the exact anti-pattern this screen corrects: in production, empty
// is honestly empty. A failed request now bubbles up so the UI can show its
// designed error state; auth errors (401/403/404) bubble untouched.
//
// Shapes (mirrored from the controllers):
//   GET  /brain/compiled_truth   → { pages, edges, raw_stats, account_id }
//   GET  /brain/documents        → { documents: [{ id, filename, content_type,
//                                     byte_size, category, status, brain_page_path,
//                                     last_error, created_at, updated_at }],
//                                     meta: { current_page, total_pages, total_count } }
//   POST /brain/documents        → (201) document JSON | (422) { error }
//   POST /brain/adjustments      → (201) document JSON | (422) { error }
//   GET  /brain/timeline         → { data: [{ id, type, occurred_at, summary,
//                                     trigger, meta }],
//                                     meta: { page, per_page, count, total_count } }

function brainBase(accountId) {
  return `/algorythmo/api/v1/accounts/${accountId}/brain`;
}

export const brainService = {
  // ── Reads (no lock, no LLM) ────────────────────────────────────────────────

  async fetchCompiledTruth(accountId) {
    const { data } = await axios.get(`${brainBase(accountId)}/compiled_truth`);
    return data;
  },

  async fetchDocuments(accountId, { page = 1, perPage = 25 } = {}) {
    const { data } = await axios.get(`${brainBase(accountId)}/documents`, {
      params: { page, per_page: perPage },
    });
    return data;
  },

  async fetchTimeline(accountId, { page = 1 } = {}) {
    const { data } = await axios.get(`${brainBase(accountId)}/timeline`, {
      params: { page },
    });
    return data;
  },

  // ── Writes (enqueue ingestion; serialised server-side by WriteLock) ─────────

  // Upload a document. The controller validates (allowlist + magic-bytes + size)
  // BEFORE persisting, so a rejected file returns 422 with { error } and never
  // touches the brain. Returns the created document (status: "pending").
  async postDocument(accountId, { file, category }) {
    const form = new FormData();
    form.append('file', file);
    form.append('category', category);
    const { data } = await axios.post(
      `${brainBase(accountId)}/documents`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data;
  },

  // Paste raw knowledge (markdown/text). Ingested through the same document
  // pipeline server-side. Returns the created document (status: "pending").
  async postAdjustment(accountId, { content, title } = {}) {
    const payload = { content };
    if (title) payload.title = title;
    const { data } = await axios.post(
      `${brainBase(accountId)}/adjustments`,
      payload
    );
    return data;
  },
};
