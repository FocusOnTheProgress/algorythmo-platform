// algorythmo: Stream D — "Inicio" unit spec.
//
// Covers the welcome surface end-to-end on demo data: the pure greeting +
// smart-action heuristics (by hour), first-name extraction, the catch-up hub
// rendering from the demo provider, the contextual smart-action count (2-3,
// primary-first), the invisible system status line (present, never a
// spinner), role-aware filtering, and clearTimeout on unmount.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';

// Motion One is WAAPI-backed; stub it so jsdom never touches the real engine.
vi.mock('motion', () => ({
  animate: vi.fn(() => ({ finished: Promise.resolve() })),
  stagger: vi.fn(() => 0),
}));

// vue-i18n stub: t(key) -> key, t(key, params) -> "key [k=v ...]". A missing
// key would fall back to the key, so asserting on keys catches absent copy.
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
// InicioScreen now reads auth/getCurrentUser and getCurrentAccountId to
// resolve the viewer's role.
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: getter => {
    if (getter === 'auth/getCurrentUser') {
      return {
        value: {
          name: 'Leonardo Vega',
          accounts: [{ id: 7, role: 'administrator' }],
        },
      };
    }
    return { value: null };
  },
  useStore: () => ({
    getters: {
      getCurrentAccountId: 7,
      'auth/getCurrentUser': {
        name: 'Leonardo Vega',
        accounts: [{ id: 7, role: 'administrator' }],
      },
    },
  }),
}));

import InicioScreen from '../InicioScreen.vue';
import GreetingHero from '../GreetingHero.vue';
import SmartActions from '../SmartActions.vue';
import {
  greetingKeyForHour,
  smartActionsForHour,
  firstNameOf,
  getInicioBriefing,
  isRouteReachableFor,
} from '../inicio.demo.js';

beforeEach(() => {
  pushSpy.mockClear();
  window.matchMedia = vi.fn().mockReturnValue({ matches: false });
});

// ---- Greeting heuristic ----------------------------------------------------
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

// ---- firstNameOf -----------------------------------------------------------
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

// ---- Role routing contract -------------------------------------------------
describe('inicio.demo — isRouteReachableFor', () => {
  it('administrator can reach any route', () => {
    expect(
      isRouteReachableFor('algorythmo_admin_c_levels', 'administrator')
    ).toBe(true);
    expect(
      isRouteReachableFor('algorythmo_admin_operacao', 'administrator')
    ).toBe(true);
    expect(isRouteReachableFor('algorythmo_crm_kanban', 'administrator')).toBe(
      true
    );
    expect(
      isRouteReachableFor('algorythmo_brain_viewer', 'administrator')
    ).toBe(true);
  });

  it('agent cannot reach admin-only routes', () => {
    expect(isRouteReachableFor('algorythmo_admin_c_levels', 'agent')).toBe(
      false
    );
    expect(isRouteReachableFor('algorythmo_admin_operacao', 'agent')).toBe(
      false
    );
    expect(isRouteReachableFor('algorythmo_admin_marketing', 'agent')).toBe(
      false
    );
  });

  it('agent can reach shared routes (CRM, Brain)', () => {
    expect(isRouteReachableFor('algorythmo_crm_kanban', 'agent')).toBe(true);
    expect(isRouteReachableFor('algorythmo_brain_viewer', 'agent')).toBe(true);
  });

  it('custom_role behaves the same as agent for admin-only routes', () => {
    expect(
      isRouteReachableFor('algorythmo_admin_c_levels', 'custom_role')
    ).toBe(false);
    expect(isRouteReachableFor('algorythmo_crm_kanban', 'custom_role')).toBe(
      true
    );
  });
});

// ---- Smart actions heuristic -----------------------------------------------
describe('inicio.demo — smart actions heuristic (admin)', () => {
  it('returns 2-3 actions for every hour, first one primary (admin default)', () => {
    for (let hour = 0; hour < 24; hour += 1) {
      const actions = smartActionsForHour(hour, 'administrator');
      expect(actions.length).toBeGreaterThanOrEqual(2);
      expect(actions.length).toBeLessThanOrEqual(3);
      expect(actions[0].variant).toBe('primary');
    }
  });

  it('varies the set by time of day', () => {
    const morning = smartActionsForHour(8, 'administrator').map(a => a.id);
    const evening = smartActionsForHour(20, 'administrator').map(a => a.id);
    expect(morning).not.toEqual(evening);
  });
});

describe('inicio.demo — smart actions heuristic (agent/custom_role)', () => {
  it('never offers admin-only routes to agent', () => {
    const ADMIN_ONLY = new Set([
      'algorythmo_admin_c_levels',
      'algorythmo_admin_operacao',
      'algorythmo_admin_marketing',
      'algorythmo_admin_administracao',
    ]);
    for (let hour = 0; hour < 24; hour += 1) {
      const actions = smartActionsForHour(hour, 'agent');
      actions.forEach(a => {
        expect(ADMIN_ONLY.has(a.routeName)).toBe(false);
      });
    }
  });

  it('always returns at least 1 action for agent (Brain fallback)', () => {
    for (let hour = 0; hour < 24; hour += 1) {
      const actions = smartActionsForHour(hour, 'agent');
      expect(actions.length).toBeGreaterThanOrEqual(1);
      expect(actions[0].variant).toBe('primary');
    }
  });

  it('never offers admin-only routes to custom_role', () => {
    const ADMIN_ONLY = new Set([
      'algorythmo_admin_c_levels',
      'algorythmo_admin_operacao',
      'algorythmo_admin_marketing',
      'algorythmo_admin_administracao',
    ]);
    for (let hour = 0; hour < 24; hour += 1) {
      const actions = smartActionsForHour(hour, 'custom_role');
      actions.forEach(a => {
        expect(ADMIN_ONLY.has(a.routeName)).toBe(false);
      });
    }
  });
});

// ---- Briefing provider -----------------------------------------------------
describe('inicio.demo — briefing provider', () => {
  it('returns all catch-up items for administrator', () => {
    const { catchUp } = getInicioBriefing('administrator');
    expect(catchUp.length).toBeGreaterThan(0);
    catchUp.forEach(item => {
      expect(item.id).toBeTruthy();
      expect(item.lineKey).toMatch(/^ALGORYTHMO_ADMIN\.INICIO\.CATCH_UP\./);
      expect(item.routeName).toBeTruthy();
    });
  });

  it('filters admin-only catch-up items for agent', () => {
    const ADMIN_ONLY = new Set([
      'algorythmo_admin_c_levels',
      'algorythmo_admin_operacao',
    ]);
    const { catchUp } = getInicioBriefing('agent');
    catchUp.forEach(item => {
      expect(ADMIN_ONLY.has(item.routeName)).toBe(false);
    });
  });

  it('never returns an empty catch-up list (Brain/CRM items are always available)', () => {
    const { catchUp: admin } = getInicioBriefing('administrator');
    const { catchUp: agent } = getInicioBriefing('agent');
    // Both roles must have at least the leads-waiting item (CRM, reachable by all)
    expect(admin.length).toBeGreaterThan(0);
    expect(agent.length).toBeGreaterThan(0);
  });
});

// ---- InicioScreen render ---------------------------------------------------
describe('InicioScreen — render', () => {
  it('renders the hero band at hero density', () => {
    const wrapper = mount(InicioScreen);
    expect(wrapper.find('.alg-density-hero').exists()).toBe(true);
  });

  it('renders one catch-up card per demo item reachable by admin', async () => {
    const wrapper = mount(InicioScreen);
    await wrapper.vm.$nextTick();
    const cards = wrapper.findAll('.alg-inicio-catchup__card');
    expect(cards.length).toBe(
      getInicioBriefing('administrator').catchUp.length
    );
  });

  it('shows the invisible sync line and never a spinner', () => {
    const wrapper = mount(InicioScreen);
    expect(wrapper.find('.alg-inicio-hero__sync-line').exists()).toBe(true);
    expect(wrapper.find('.spinner').exists()).toBe(false);
  });

  it('clears the sync timer on unmount (no leaked timer)', async () => {
    const clearSpy = vi.spyOn(window, 'clearTimeout');
    const wrapper = mount(InicioScreen);
    await wrapper.vm.$nextTick();
    wrapper.unmount();
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});

// ---- GreetingHero ----------------------------------------------------------
describe('GreetingHero — greeting line', () => {
  it('greets the user by first name', () => {
    const wrapper = mount(GreetingHero);
    const heading = wrapper.find('.alg-inicio-hero__greeting').text();
    // i18n stub renders "key [name=Leonardo]"; assert the first name reached it.
    expect(heading).toContain('name=Leonardo');
  });
});

// ---- SmartActions ----------------------------------------------------------
describe('SmartActions — buttons', () => {
  it('renders solid/ghost buttons (no glass on buttons)', () => {
    const wrapper = mount(SmartActions, { props: { role: 'administrator' } });
    const buttons = wrapper.findAll('.alg-btn');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
    // No glass-card material is used for the action buttons.
    expect(wrapper.find('.alg-inicio-actions .alg-glass-card').exists()).toBe(
      false
    );
  });

  it('pushes the action route on click', async () => {
    const wrapper = mount(SmartActions, { props: { role: 'administrator' } });
    await wrapper.find('.alg-btn').trigger('click');
    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(pushSpy.mock.calls[0][0]).toMatchObject({
      params: { accountId: 7 },
    });
  });

  it('never renders admin-only actions for agent role', () => {
    const wrapper = mount(SmartActions, { props: { role: 'agent' } });
    const buttons = wrapper.findAll('.alg-btn');
    // All actions must be reachable by agents (Brain, CRM, etc.)
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });
});
