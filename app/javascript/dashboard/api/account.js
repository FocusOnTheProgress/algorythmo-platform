/* global axios */
import ApiClient from './ApiClient';

class AccountAPI extends ApiClient {
  constructor() {
    super('', { accountScoped: true });
  }

  // algorythmo: cross-account guard fix (M2-B1.5)
  // Default `super.get()` derives the account id from `window.location.pathname`,
  // which is STALE during a `beforeEach` route guard (URL has not committed yet).
  // When the router pre-fetches account flags for a NEW target account, pass
  // `accountId` explicitly so we hit the right /accounts/:id endpoint.
  get(accountId) {
    // `Number.isFinite` rejects NaN / Infinity / strings: if the upstream
    // router guard ever passes a garbage id, fall back to the default scoped
    // URL instead of issuing `GET /accounts/NaN` and burning a Sentry event.
    if (Number.isFinite(accountId)) {
      return axios.get(`${this.apiVersion}/accounts/${accountId}`);
    }
    return super.get();
  }

  createAccount(data) {
    return axios.post(`${this.apiVersion}/accounts`, data);
  }

  async getCacheKeys() {
    const response = await axios.get(
      `/api/v1/accounts/${this.accountIdFromRoute}/cache_keys`
    );
    return response.data.cache_keys;
  }
}

export default new AccountAPI();
