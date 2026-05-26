/* global axios */
// algorythmo: M3-PR3 — Brain service layer
// Tries the Rails API first. Falls back to fixtures when the backend returns
// 501 (PR M3-4 ingestion not yet merged) or when the endpoint is absent.
// The fixture fallback warns loudly in DEV so engineers never silently ship
// stale data to production.
import compiledTruthFixture from './fixtures/compiledTruth.json';
import timelineFixture from './fixtures/timeline.json';

const DEV = import.meta.env.DEV;

const warnFixture = name => {
  if (DEV) {
    // eslint-disable-next-line no-console
    console.warn(
      `[Brain] API not available for "${name}" — using fixture. ` +
        'Real data available after PR M3-4 merges.'
    );
  }
};

// Only 501 (Not Implemented) means "backend stub — M3-4 ingestion not yet merged".
// 404 means the route is gone or accountId is invalid — that must NOT silently
// degrade to fixtures, otherwise a founder sees Day-1 placeholder data thinking
// it's live. Auth errors (401/403) also bubble up untouched.
const isStubStatus = err => err?.response?.status === 501;

function brainBase(accountId) {
  return `/algorythmo/api/v1/accounts/${accountId}/brain`;
}

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
