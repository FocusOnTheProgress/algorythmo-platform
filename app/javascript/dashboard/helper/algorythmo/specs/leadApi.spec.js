import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock global axios before importing the module.
const mockAxios = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
};
vi.stubGlobal('axios', mockAxios);

import {
  fetchDefaultPipeline,
  fetchLeads,
  fetchLead,
  moveLead,
  reopenLead,
  updateLead,
  createLead,
  fetchLeadConversations,
  fetchStageHistory,
  renameStage,
  updateStage,
  accountIdFromPath,
} from '../leadApi.js';

describe('leadApi', () => {
  const ACCOUNT_ID = '42';
  const BASE = `/algorythmo/api/v1/accounts/${ACCOUNT_ID}`;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAxios.get.mockResolvedValue({ data: {} });
    mockAxios.post.mockResolvedValue({ data: {} });
    mockAxios.patch.mockResolvedValue({ data: {} });
  });

  describe('fetchDefaultPipeline', () => {
    it('calls GET /pipelines/default', async () => {
      await fetchDefaultPipeline(ACCOUNT_ID);
      expect(mockAxios.get).toHaveBeenCalledWith(`${BASE}/pipelines/default`);
    });
  });

  describe('fetchLeads', () => {
    it('calls GET /leads with params', async () => {
      await fetchLeads(ACCOUNT_ID, { stage_id: 7, limit: 50 });
      expect(mockAxios.get).toHaveBeenCalledWith(`${BASE}/leads`, {
        params: { stage_id: 7, limit: 50 },
      });
    });

    it('supports contact_id filter', async () => {
      await fetchLeads(ACCOUNT_ID, { contact_id: 99 });
      expect(mockAxios.get).toHaveBeenCalledWith(`${BASE}/leads`, {
        params: { contact_id: 99 },
      });
    });

    it('supports cursor pagination', async () => {
      await fetchLeads(ACCOUNT_ID, { stage_id: 1, cursor: 'abc', limit: 50 });
      expect(mockAxios.get).toHaveBeenCalledWith(`${BASE}/leads`, {
        params: { stage_id: 1, cursor: 'abc', limit: 50 },
      });
    });
  });

  describe('fetchLead', () => {
    it('calls GET /leads/:id', async () => {
      await fetchLead(ACCOUNT_ID, 123);
      expect(mockAxios.get).toHaveBeenCalledWith(`${BASE}/leads/123`);
    });
  });

  describe('moveLead', () => {
    it('calls PATCH /leads/:id/move with stage_id', async () => {
      await moveLead(ACCOUNT_ID, 5, 3);
      expect(mockAxios.patch).toHaveBeenCalledWith(`${BASE}/leads/5/move`, {
        stage_id: 3,
      });
    });
  });

  describe('reopenLead', () => {
    it('calls POST /leads/:id/reopen', async () => {
      await reopenLead(ACCOUNT_ID, 7);
      expect(mockAxios.post).toHaveBeenCalledWith(`${BASE}/leads/7/reopen`);
    });
  });

  describe('updateLead', () => {
    it('calls PATCH /leads/:id with lead wrapper', async () => {
      await updateLead(ACCOUNT_ID, 2, { custom_fields: { note: 'test' } });
      expect(mockAxios.patch).toHaveBeenCalledWith(`${BASE}/leads/2`, {
        lead: { custom_fields: { note: 'test' } },
      });
    });
  });

  describe('createLead', () => {
    it('calls POST /leads with lead wrapper', async () => {
      await createLead(ACCOUNT_ID, { contact_id: 1, stage_id: 2 });
      expect(mockAxios.post).toHaveBeenCalledWith(`${BASE}/leads`, {
        lead: { contact_id: 1, stage_id: 2 },
      });
    });
  });

  describe('fetchLeadConversations', () => {
    it('calls GET /leads/:id/conversations', async () => {
      await fetchLeadConversations(ACCOUNT_ID, 10, { limit: 10 });
      expect(mockAxios.get).toHaveBeenCalledWith(
        `${BASE}/leads/10/conversations`,
        { params: { limit: 10 } }
      );
    });

    it('supports cursor param', async () => {
      await fetchLeadConversations(ACCOUNT_ID, 10, {
        cursor: 'xyz',
        limit: 10,
      });
      expect(mockAxios.get).toHaveBeenCalledWith(
        `${BASE}/leads/10/conversations`,
        { params: { cursor: 'xyz', limit: 10 } }
      );
    });
  });

  describe('fetchStageHistory', () => {
    it('calls GET /leads/:id/stage_history', async () => {
      await fetchStageHistory(ACCOUNT_ID, 77);
      expect(mockAxios.get).toHaveBeenCalledWith(
        `${BASE}/leads/77/stage_history`
      );
    });

    it('rejects on invalid accountId', () => {
      expect(() => fetchStageHistory('bad-id', 1)).toThrow(/invalid accountId/);
    });
  });

  describe('renameStage', () => {
    it('calls PATCH /stages/:id/rename', async () => {
      await renameStage(ACCOUNT_ID, 3, 'Qualificado');
      expect(mockAxios.patch).toHaveBeenCalledWith(`${BASE}/stages/3/rename`, {
        name: 'Qualificado',
      });
    });
  });

  describe('updateStage', () => {
    it('calls PATCH /stages/:id with stage wrapper', async () => {
      await updateStage(ACCOUNT_ID, 4, { aging_coefficient: 2 });
      expect(mockAxios.patch).toHaveBeenCalledWith(`${BASE}/stages/4`, {
        stage: { aging_coefficient: 2 },
      });
    });
  });

  describe('accountIdFromPath', () => {
    afterEach(() => {
      // Restore jsdom URL after each test.
      window.history.pushState({}, '', '/');
    });

    it('extracts account id from /app/accounts/:id/... URL', () => {
      window.history.pushState({}, '', '/app/accounts/99/conversations');
      expect(accountIdFromPath()).toBe('99');
    });

    it('returns empty string when not in accounts URL', () => {
      window.history.pushState({}, '', '/app/login');
      expect(accountIdFromPath()).toBe('');
    });
  });
});
