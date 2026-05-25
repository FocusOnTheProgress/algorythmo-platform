/* global axios */

// =============================================================================
// Algorythmo OS — Lead API client
// =============================================================================
// Axios wrappers for the Algorythmo CRM API endpoints.
// Base: /algorythmo/api/v1/accounts/:accountId
//
// NOT extending ApiClient because ApiClient assumes /api/v1.
// All requests use the global axios instance (same pattern as contacts.js etc.).
// =============================================================================

/**
 * Resolves the current account ID from the window location.
 * Mirrors the pattern in ApiClient.accountIdFromRoute.
 * @returns {string}
 */
function accountIdFromPath() {
  // Expected path: /app/accounts/:accountId/...
  // Find 'accounts' only when preceded by 'app' to avoid false positives.
  const parts = window.location.pathname.split('/');
  const appIdx = parts.indexOf('app');
  if (appIdx === -1 || parts[appIdx + 1] !== 'accounts') return '';
  const id = parseInt(parts[appIdx + 2], 10);
  return Number.isFinite(id) && id > 0 ? String(id) : '';
}

function assertAccountId(id) {
  if (!/^\d+$/.test(String(id))) {
    throw new Error(`algorythmo:leadApi: invalid accountId "${id}"`);
  }
}

/**
 * @param {string|number} accountId
 * @returns {string}
 */
function baseUrl(accountId) {
  assertAccountId(accountId);
  return `/algorythmo/api/v1/accounts/${accountId}`;
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

/**
 * Fetch the default pipeline with its stages.
 * @param {string|number} accountId
 * @returns {Promise<{ pipeline: object, stages: object[] }>}
 */
export function fetchDefaultPipeline(accountId) {
  return axios.get(`${baseUrl(accountId)}/pipelines/default`);
}

/**
 * Fetch the funnel observability payload for a single pipeline.
 * Backend wraps the computation in a 60s Rails.cache.fetch — same TTL as
 * FeatureGate (P2/T7). The Kanban surface fetches once on mount and re-fetches
 * after each drop, so the cache absorbs parallel reads by multiple agents.
 * Contract: CONTRACT_M1B §9 v1.2.0.
 * @param {string|number} accountId
 * @param {string|number} pipelineId
 * @returns {Promise<{ data: {
 *   pipeline_id: number, computed_at: string, ttl_seconds: number,
 *   summary: { open_leads: number, avg_funnel_hours: number, conversion_rate: number },
 *   stages: Array<{ stage_id: number, stage_kind: string, lead_count: number,
 *     avg_time_in_stage_seconds: number, conversion_rate_to_next: number|null }>
 * } }>}
 */
export function fetchPipelineMetrics(accountId, pipelineId) {
  return axios.get(`${baseUrl(accountId)}/pipelines/${pipelineId}/metrics`);
}

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

/**
 * @typedef {object} LeadListParams
 * @property {string|number} [stage_id]   - Required unless contact_id is given.
 * @property {string|number} [contact_id] - Alternative filter (returns open leads only).
 * @property {string}        [cursor]     - Cursor-pagination cursor.
 * @property {number}        [limit]      - Default 50, max 200.
 */

/**
 * List leads by stage or contact.
 * @param {string|number}  accountId
 * @param {LeadListParams} params
 */
export function fetchLeads(accountId, params) {
  return axios.get(`${baseUrl(accountId)}/leads`, { params });
}

/**
 * Fetch a single lead by ID.
 * @param {string|number} accountId
 * @param {string|number} leadId
 */
export function fetchLead(accountId, leadId) {
  return axios.get(`${baseUrl(accountId)}/leads/${leadId}`);
}

/**
 * Move a lead to a different stage.
 * @param {string|number} accountId
 * @param {string|number} leadId
 * @param {string|number} stageId
 */
export function moveLead(accountId, leadId, stageId) {
  return axios.patch(`${baseUrl(accountId)}/leads/${leadId}/move`, {
    stage_id: stageId,
  });
}

/**
 * Reopen a won/lost lead (creates a new lead with previous_lead_id set).
 * @param {string|number} accountId
 * @param {string|number} leadId
 */
export function reopenLead(accountId, leadId) {
  return axios.post(`${baseUrl(accountId)}/leads/${leadId}/reopen`);
}

/**
 * Update lead fields (excluding stage_id, contact_id, previous_lead_id).
 * @param {string|number} accountId
 * @param {string|number} leadId
 * @param {object}        data
 */
export function updateLead(accountId, leadId, data) {
  return axios.patch(`${baseUrl(accountId)}/leads/${leadId}`, { lead: data });
}

/**
 * Create a lead (manual — normally auto-created by CrmListener).
 * @param {string|number} accountId
 * @param {object}        data
 */
export function createLead(accountId, data) {
  return axios.post(`${baseUrl(accountId)}/leads`, { lead: data });
}

/**
 * Fetch paginated conversations associated with a lead.
 * @param {string|number} accountId
 * @param {string|number} leadId
 * @param {{ cursor?: string, limit?: number }} params
 */
export function fetchLeadConversations(accountId, leadId, params = {}) {
  return axios.get(`${baseUrl(accountId)}/leads/${leadId}/conversations`, {
    params,
  });
}

/**
 * Fetch the stage transition history for a lead.
 * Backend caps the response at 100 entries — `truncated: true` signals an
 * older history exists past the window.
 * @param {string|number} accountId
 * @param {string|number} leadId
 * @returns {Promise<{ data: { stage_history: object[], truncated: boolean } }>}
 */
export function fetchStageHistory(accountId, leadId) {
  return axios.get(`${baseUrl(accountId)}/leads/${leadId}/stage_history`);
}

// ---------------------------------------------------------------------------
// Stages
// ---------------------------------------------------------------------------

/**
 * Rename a stage.
 * @param {string|number} accountId
 * @param {string|number} stageId
 * @param {string}        name
 */
export function renameStage(accountId, stageId, name) {
  return axios.patch(`${baseUrl(accountId)}/stages/${stageId}/rename`, {
    name,
  });
}

/**
 * Update stage settings (e.g. aging_coefficient). Admin only.
 * @param {string|number} accountId
 * @param {string|number} stageId
 * @param {object}        data - e.g. { aging_coefficient: 2 }
 */
export function updateStage(accountId, stageId, data) {
  return axios.patch(`${baseUrl(accountId)}/stages/${stageId}`, {
    stage: data,
  });
}

// ---------------------------------------------------------------------------
// Convenience: account ID from current URL (for composables that don't have
// it as a prop). Prefer passing accountId explicitly when available.
// ---------------------------------------------------------------------------
export { accountIdFromPath };
