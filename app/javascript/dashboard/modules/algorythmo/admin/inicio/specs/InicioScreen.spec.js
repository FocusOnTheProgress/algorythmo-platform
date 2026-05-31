// algorythmo: Stream D — "Início" unit spec.
//
// Covers the welcome surface end-to-end on demo data: the pure greeting +
// smart-action heuristics (by hour), first-name extraction, the catch-up hub
// rendering from the demo provider, the contextual smart-action count (2–3,
// primary-first), and the invisible system status line (present, never a
// spinner). Motion One is stubbed so jsdom never touches the real engine.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';

// Motion One is WAAPI-backed; stub it so jsdom never touches the real engine.
vi.mock('motion', () => ({
  animate: vi.fn(() => ({ finished: Promise.resolve() })),
  stagger: vi.fn(() => 0),
}));

// vue-i18n stub: t(key) → key, t(key, params) → "key [k=v …]". A missing key
// would fall back to the key, so asserting on keys catches absent copy.
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key, params) => {
      if (!params) return key;
      const interpolated = Object.entries(params)
        .map(([k, v]) => `${k}=${v}`)
        .join(' ');
      return `${key} [${interpolated}]`;
    },
  }),
}));

// vue-router stub — the action/catch-up buttons push routes; we only need push
// to be callable without a real router.
const pushSpy = vi.fn();
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: pushSpy }),
}));

// store composables — provide a current user + account id.
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: getter => {
    if (getter === 'auth/getCurrentUser') {
      return { value: { name: 'Leonardo Vega' } };
    }
    return { value: null };
  },
  useStore: () => ({ getters: { getCurrentAccountId: 7 } }),
}));

import InicioScreen from '../InicioScreen.vue';
import GreetingHero from '../GreetingHero.vue';
import SmartActions from '../SmartActions.vue';
import {
  greetingKeyForHour,
  smartActionsForHour,
  firstNameOf,
  getInicioBriefing,
} from '../inicio.demo.js';

beforeEach(() => {
  pushSpy.mockClear();
  window.matchMedia = vi.fn().mockReturnValue({ matches: false });
});

describe('inicio.demo — greeting heuristic', () => {
  it('maps the hour to the right greeting key', () => {
    expect(greetingKeyForHour(6)).toBe(
      'ALGORYTHMO_ADMIN.INICIO.GREETING.MORNING'
    );
    expect(greetingKeyForHour(11)).toBe(
      'ALGORYTHMO_ADMIN.INICIO.GREETING.MORNING'
    );
    expect(greetingKeyForHour(12)).toBe(
      'ALGORYTHMO_ADMIN.INICIO.GREETING.AFTERNOON'
    );
    expect(greetingKeyForHour(17)).toBe(
      'ALGORYTHMO_ADMIN.INICIO.GREETING.AFTERNOON'
    );
    expect(greetingKeyForHour(18)).toBe(
      'ALGORYTHMO_ADMIN.INICIO.GREETING.EVENING'
    );
    expect(greetingKeyForHour(23)).toBe(
      'ALGORYTHMO_ADMIN.INICIO.GREETING.EVENING'
    );
  });
});

describe('inicio.demo — firstNameOf', () => {
  it('takes the first token of a full name', () => {
    expect(firstNameOf('Leonardo Vega')).toEqual({ value: 'Leonardo' });
    expect(firstNameOf('  Ana   Beatriz  ')).toEqual({ value: 'Ana' });
  });

  it('falls back to a key when the name is missing', () => {
    expect(firstNameOf('')).toEqual({
      key: 'ALGORYTHMO_ADMIN.INICIO.GREETING.FALLBACK_NAME',
    });
    expect(firstNameOf(null)).toEqual({
      key: 'ALGORYTHMO_ADMIN.INICIO.GREETING.FALLBACK_NAME',
    });
  });
});

describe('inicio.demo — smart actions heuristic', () => {
  it('returns 2–3 actions for every hour, first one primary', () => {
    for (let hour = 0; hour < 24; hour += 1) {
      const actions = smartActionsForHour(hour);
      expect(actions.length).toBeGreaterThanOrEqual(2);
      expect(actions.length).toBeLessThanOrEqual(3);
      expect(actions[0].variant).toBe('primary');
    }
  });

  it('varies the set by time of day', () => {
    const morning = smartActionsForHour(8).map(a => a.id);
    const evening = smartActionsForHour(20).map(a => a.id);
    expect(morning).not.toEqual(evening);
  });
});

describe('inicio.demo — briefing provider', () => {
  it('returns catch-up items shaped for the hub', () => {
    const { catchUp } = getInicioBriefing();
    expect(catchUp.length).toBeGreaterThan(0);
    catchUp.forEach(item => {
      expect(item.id).toBeTruthy();
      expect(item.lineKey).toMatch(/^ALGORYTHMO_ADMIN\.INICIO\.CATCH_UP\./);
      expect(item.routeName).toBeTruthy();
    });
  });
});

describe('InicioScreen — render', () => {
  it('renders the hero band at hero density', () => {
    const wrapper = mount(InicioScreen);
    expect(wrapper.find('.alg-density-hero').exists()).toBe(true);
  });

  it('renders one catch-up card per demo item', async () => {
    const wrapper = mount(InicioScreen);
    // Briefing is loaded in onMounted; let the v-for flush before asserting.
    await wrapper.vm.$nextTick();
    const cards = wrapper.findAll('.alg-inicio-catchup__card');
    expect(cards.length).toBe(getInicioBriefing().catchUp.length);
  });

  it('shows the invisible sync line and never a spinner', () => {
    const wrapper = mount(InicioScreen);
    expect(wrapper.find('.alg-inicio-hero__sync-line').exists()).toBe(true);
    expect(wrapper.find('.spinner').exists()).toBe(false);
  });
});

describe('GreetingHero — greeting line', () => {
  it('greets the user by first name', () => {
    const wrapper = mount(GreetingHero);
    const heading = wrapper.find('.alg-inicio-hero__greeting').text();
    // i18n stub renders "key [name=Leonardo]"; assert the first name reached it.
    expect(heading).toContain('name=Leonardo');
  });
});

describe('SmartActions — buttons', () => {
  it('renders solid/ghost buttons (no glass on buttons)', () => {
    const wrapper = mount(SmartActions);
    const buttons = wrapper.findAll('.alg-btn');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
    // No glass-card material is used for the action buttons.
    expect(wrapper.find('.alg-inicio-actions .alg-glass-card').exists()).toBe(
      false
    );
  });

  it('pushes the action route on click', async () => {
    const wrapper = mount(SmartActions);
    await wrapper.find('.alg-btn').trigger('click');
    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(pushSpy.mock.calls[0][0]).toMatchObject({
      params: { accountId: 7 },
    });
  });
});
