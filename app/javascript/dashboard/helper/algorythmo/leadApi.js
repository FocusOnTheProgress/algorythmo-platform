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
  const parts = window.location.pathname.split('/');
  const idx = parts.indexOf('accounts');
  return idx !== -1 ? parts[idx + 1] : '';
}

/**
 * @param {string} accountId
 * @returns {string}
 */
function baseUrl(accountId) {
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
