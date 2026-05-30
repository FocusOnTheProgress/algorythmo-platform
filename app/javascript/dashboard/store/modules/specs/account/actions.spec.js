import axios from 'axios';
import * as Sentry from '@sentry/vue';
import { actions, getters } from '../../accounts';
import * as types from '../../../mutation-types';

const accountData = {
  id: 1,
  name: 'Company one',
  locale: 'en',
};

const newAccountInfo = {
  accountName: 'Company two',
};

const commit = vi.fn();
global.axios = axios;
vi.mock('axios');
vi.mock('@sentry/vue', () => ({ captureException: vi.fn() }));

beforeEach(() => {
  commit.mockClear();
  Sentry.captureException.mockClear();
});

describe('#actions', () => {
  describe('#get', () => {
    it('sends correct actions if API is success', async () => {
      axios.get.mockResolvedValue({ data: accountData });
      await actions.get({ commit });
      expect(commit.mock.calls).toEqual([
        [types.default.SET_ACCOUNT_UI_FLAG, { isFetchingItem: true }],
        [types.default.ADD_ACCOUNT, accountData],
        [types.default.SET_ACCOUNT_UI_FLAG, { isFetchingItem: false }],
      ]);
    });
    it('sends correct actions if API is error', async () => {
      axios.get.mockRejectedValue({ message: 'Incorrect header' });
      await actions.get({ commit });
      expect(commit.mock.calls).toEqual([
        [types.default.SET_ACCOUNT_UI_FLAG, { isFetchingItem: true }],
        [types.default.SET_ACCOUNT_UI_FLAG, { isFetchingItem: false }],
      ]);
    });

    // algorythmo: M2-B1.5 — cross-account fetch + Sentry observability
    it('hits /accounts/:id when an explicit accountId is passed', async () => {
      axios.get.mockResolvedValue({ data: accountData });
      await actions.get({ commit }, { accountId: 42 });
      expect(axios.get).toHaveBeenCalledWith('/api/v1/accounts/42');
    });

    it('falls back to scoped URL when no accountId is provided', async () => {
      axios.get.mockResolvedValue({ data: accountData });
      await actions.get({ commit });
      // ApiClient prefixes with /api/v1 + accountScoped path derived from
      // window.location. In the test env the path is `/`, so no /accounts/:id
      // prefix gets added — verify the URL does NOT contain an explicit
      // /accounts/42 segment (the cross-account regression we are guarding).
      const calledUrl = axios.get.mock.calls[0][0];
      expect(calledUrl).not.toContain('/accounts/42');
    });

    it('reports to Sentry when the fetch fails (so on-call gets a signal)', async () => {
      axios.get.mockRejectedValue(new Error('network down'));
      await actions.get({ commit }, { silent: true, accountId: 7 });
      expect(Sentry.captureException).toHaveBeenCalledTimes(1);
      const [err, ctx] = Sentry.captureException.mock.calls[0];
      expect(err.message).toBe('network down');
      expect(ctx.tags.source).toBe('accounts/get');
      expect(ctx.tags.silent).toBe(true);
      expect(ctx.extra.accountId).toBe(7);
    });

    it('does NOT toggle UI flags when called with silent: true', async () => {
      axios.get.mockResolvedValue({ data: accountData });
      await actions.get({ commit }, { silent: true, accountId: 1 });
      expect(commit.mock.calls).toEqual([
        [types.default.ADD_ACCOUNT, accountData],
      ]);
    });
  });

  describe('#update', () => {
    it('sends correct actions if API is success', async () => {
      axios.patch.mockResolvedValue({
        data: { id: 1, name: 'John' },
      });
      await actions.update({ commit, getters }, accountData);
      expect(commit.mock.calls).toEqual([
        [types.default.SET_ACCOUNT_UI_FLAG, { isUpdating: true }],
        [types.default.EDIT_ACCOUNT, { id: 1, name: 'John' }],
        [types.default.SET_ACCOUNT_UI_FLAG, { isUpdating: false }],
      ]);
    });
    it('sends correct actions if API is error', async () => {
      axios.patch.mockRejectedValue({ message: 'Incorrect header' });
      await expect(
        actions.update({ commit, getters }, accountData)
      ).rejects.toThrow(Error);
      expect(commit.mock.calls).toEqual([
        [types.default.SET_ACCOUNT_UI_FLAG, { isUpdating: true }],
        [types.default.SET_ACCOUNT_UI_FLAG, { isUpdating: false }],
      ]);
    });

    // algorythmo: client logo upload — when a File is present the payload must
    // go as multipart/FormData, not JSON, so ActiveStorage receives the file.
    it('sends a FormData payload when a logo File is present', async () => {
      axios.patch.mockResolvedValue({ data: { id: 1, name: 'John' } });
      const logo = new File(['x'], 'logo.png', { type: 'image/png' });
      await actions.update({ commit, getters }, { name: 'John', logo });
      const sentPayload = axios.patch.mock.calls[0][1];
      expect(sentPayload).toBeInstanceOf(FormData);
      expect(sentPayload.get('name')).toBe('John');
      expect(sentPayload.get('logo')).toBe(logo);
    });

    it('sends a plain JSON object when no logo File is present', async () => {
      axios.patch.mockResolvedValue({ data: { id: 1, name: 'John' } });
      await actions.update({ commit, getters }, { name: 'John' });
      const sentPayload = axios.patch.mock.calls[0][1];
      expect(sentPayload).not.toBeInstanceOf(FormData);
      expect(sentPayload).toEqual({ name: 'John' });
    });
  });

  describe('#removeLogo', () => {
    it('commits the refreshed account on success', async () => {
      axios.delete.mockResolvedValue({ data: { id: 1, logo_url: null } });
      await actions.removeLogo({ commit });
      expect(commit.mock.calls).toEqual([
        [types.default.SET_ACCOUNT_UI_FLAG, { isUpdating: true }],
        [types.default.EDIT_ACCOUNT, { id: 1, logo_url: null }],
        [types.default.SET_ACCOUNT_UI_FLAG, { isUpdating: false }],
      ]);
    });

    it('clears the updating flag and rethrows on error', async () => {
      axios.delete.mockRejectedValue({ message: 'Incorrect header' });
      await expect(actions.removeLogo({ commit })).rejects.toThrow(Error);
      expect(commit.mock.calls).toEqual([
        [types.default.SET_ACCOUNT_UI_FLAG, { isUpdating: true }],
        [types.default.SET_ACCOUNT_UI_FLAG, { isUpdating: false }],
      ]);
    });
  });

  describe('#create', () => {
    it('sends correct actions if API is success', async () => {
      axios.post.mockResolvedValue({
        data: { data: { id: 1, name: 'John' } },
      });
      await actions.create({ commit, getters }, newAccountInfo);
      expect(commit.mock.calls).toEqual([
        [types.default.SET_ACCOUNT_UI_FLAG, { isCreating: true }],
        [types.default.SET_ACCOUNT_UI_FLAG, { isCreating: false }],
      ]);
    });
    it('sends correct actions if API is error', async () => {
      axios.patch.mockRejectedValue({ message: 'Incorrect header' });
      await expect(
        actions.create({ commit, getters }, newAccountInfo)
      ).rejects.toThrow(Error);
      expect(commit.mock.calls).toEqual([
        [types.default.SET_ACCOUNT_UI_FLAG, { isCreating: true }],
        [types.default.SET_ACCOUNT_UI_FLAG, { isCreating: false }],
      ]);
    });
  });

  describe('#toggleDeletion', () => {
    it('sends correct actions with delete action if API is success', async () => {
      axios.post.mockResolvedValue({});
      await actions.toggleDeletion({ commit }, { action_type: 'delete' });
      expect(commit.mock.calls).toEqual([
        [types.default.SET_ACCOUNT_UI_FLAG, { isUpdating: true }],
        [types.default.SET_ACCOUNT_UI_FLAG, { isUpdating: false }],
      ]);
      expect(axios.post.mock.calls[0][1]).toEqual({
        action_type: 'delete',
      });
    });

    it('sends correct actions with undelete action if API is success', async () => {
      axios.post.mockResolvedValue({});
      await actions.toggleDeletion({ commit }, { action_type: 'undelete' });
      expect(commit.mock.calls).toEqual([
        [types.default.SET_ACCOUNT_UI_FLAG, { isUpdating: true }],
        [types.default.SET_ACCOUNT_UI_FLAG, { isUpdating: false }],
      ]);
      expect(axios.post.mock.calls[0][1]).toEqual({
        action_type: 'undelete',
      });
    });

    it('sends correct actions if API is error', async () => {
      axios.post.mockRejectedValue({ message: 'Incorrect header' });
      await expect(
        actions.toggleDeletion({ commit }, { action_type: 'delete' })
      ).rejects.toThrow(Error);
      expect(commit.mock.calls).toEqual([
        [types.default.SET_ACCOUNT_UI_FLAG, { isUpdating: true }],
        [types.default.SET_ACCOUNT_UI_FLAG, { isUpdating: false }],
      ]);
    });
  });
});
