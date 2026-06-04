/* global axios */
// algorythmo: Brain service layer
// Tries the Rails API first. Falls back to fixtures when the backend returns
// 501 (backend stub not yet implemented for that endpoint) — kept as a safety
// net even after compiled_truth went live (PR 0012-1). Auth errors (401/403)
// and 404 bubble up untouched — never silently degrade to fixtures.
import compiledTruthFixture from './fixtures/compiledTruth.json';
import timelineFixture from './fixtures/timeline.json';

const DEV = import.meta.env.DEV;

const warnFixture = name => {
  if (DEV) {
    // eslint-disable-next-line no-console
    console.warn(
      `[Brain] API returned 501 for "${name}" — using fixture as safety net. ` +
        'Check that the backend endpoint is implemented and deployed.'
    );
  }
};

// Only 501 (Not Implemented) means "backend stub not yet live".
// 404 means the route is gone or accountId is invalid — that must NOT silently
// degrade to fixtures, otherwise a user sees placeholder data thinking it's live.
// Auth errors (401/403) also bubble up untouched.
const isStubStatus = err => err?.response?.status === 501;

function brainBase(accountId) {
  return `/algorythmo/api/v1/accounts/${accountId}/brain`;
}

// compiled_truth shape (200 real response):
//   { pages: Integer, edges: Integer, raw_stats: Hash, account_id: Integer }
// Empty brain returns zeros — never an error at the API level.
export const brainService = {
  async fetchCompiledTruth(accountId) {
    try {
      const { data } = await axios.get(
        `${brainBase(accountId)}/compiled_truth`
      );
      return data;
    } catch (err) {
      if (isStubStatus(err)) {
        warnFixture('compiled_truth');
        return compiledTruthFixture;
      }
      throw err;
    }
  },

  async fetchTimeline(accountId) {
    try {
      const { data } = await axios.get(`${brainBase(accountId)}/timeline`);
      return data;
    } catch (err) {
      if (isStubStatus(err)) {
        warnFixture('timeline');
        return timelineFixture;
      }
      throw err;
    }
  },
};
