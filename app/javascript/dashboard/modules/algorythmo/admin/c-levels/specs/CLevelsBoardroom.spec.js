// algorythmo: Stream E — "Sala de Conselho IA" unit spec.
//
// Covers the round state machine end-to-end on demo data: committee seating
// (E1), starting a round + rendering debate bubbles (E4/E2), the three proposal
// actions and their effect on per-turn status, the data pill → source report
// modal, and the ghost-line impact simulator wiring (E3). ProjectionChart is
// covered for geometry (baseline vs ghost paths) so the differentiator can't
// silently regress.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';

// Motion One is WAAPI-backed; stub it so jsdom never touches the real engine.
vi.mock('motion', () => ({
  animate: vi.fn(() => ({ finished: Promise.resolve() })),
  stagger: vi.fn(() => 0),
}));

// vue-i18n stub: t(key) → key, t(key, params) → "key [k=v …]". A real missing
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

import CLevelsBoardroom from '../CLevelsBoardroom.vue';
import ProjectionChart from '../ProjectionChart.vue';
import { DIRECTORS, INDICATORS, debateForGoal } from '../clevels.demo.js';

beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: false });
});

function mountRoom() {
  return mount(CLevelsBoardroom);
}

describe('CLevelsBoardroom — E1 committee', () => {
  it('renders one status card per director, all seated by default', () => {
    const wrapper = mountRoom();
    const cards = wrapper.findAll('.alg-cl-director');
    expect(cards.length).toBe(DIRECTORS.length);
    cards.forEach(card =>
      expect(card.classes()).toContain('alg-cl-director--seated')
    );
  });

  it('"Chamar para a Mesa" toggle removes/adds a director from the round', async () => {
    const wrapper = mountRoom();
    const firstSwitch = wrapper.find('.alg-cl-director__switch');
    expect(firstSwitch.attributes('aria-checked')).toBe('true');
    await firstSwitch.trigger('click');
    expect(firstSwitch.attributes('aria-checked')).toBe('false');
    expect(wrapper.findAll('.alg-cl-director')[0].classes()).not.toContain(
      'alg-cl-director--seated'
    );
  });

  it('shows the readiness pulse when a director has fresh data', () => {
    const wrapper = mountRoom();
    expect(wrapper.find('.alg-cl-director__pulse').exists()).toBe(true);
  });
});

describe('CLevelsBoardroom — E4 opening + E2 debate', () => {
  it('starts the opening prompt before any round', () => {
    const wrapper = mountRoom();
    expect(wrapper.find('.alg-cl-opening').exists()).toBe(true);
    expect(wrapper.find('.alg-cl-room__flow').exists()).toBe(false);
  });

  it('choosing a goal chip starts the debate and renders bubbles', async () => {
    const wrapper = mountRoom();
    const chips = wrapper.findAll('.alg-cl-chip');
    expect(chips.length).toBeGreaterThan(0);
    await chips[0].trigger('click');
    expect(wrapper.find('.alg-cl-opening').exists()).toBe(false);
    expect(wrapper.findAll('.alg-cl-bubble').length).toBeGreaterThan(0);
  });

  it('only seated directors speak in the debate', async () => {
    const wrapper = mountRoom();
    // Exclude every director, then start a round → no bubbles, empty note.
    const switches = wrapper.findAll('.alg-cl-director__switch');
    // Sequential toggles (await each) without a banned for…of loop.
    await switches.reduce(
      (chain, sw) => chain.then(() => sw.trigger('click')),
      Promise.resolve()
    );
    await wrapper.find('.alg-cl-chip').trigger('click');
    expect(wrapper.findAll('.alg-cl-bubble').length).toBe(0);
    expect(wrapper.find('.alg-cl-room__empty').exists()).toBe(true);
  });
});

describe('CLevelsBoardroom — E2 proposal actions', () => {
  async function startRound(wrapper) {
    await wrapper.find('.alg-cl-chip').trigger('click');
  }

  it('Descartar archives the proposal and clears the simulator preview', async () => {
    const wrapper = mountRoom();
    await startRound(wrapper);
    const dismiss = wrapper.find('.alg-cl-action--dismiss');
    await dismiss.trigger('click');
    const dismissed = wrapper.find('.alg-cl-bubble--dismissed');
    expect(dismissed.exists()).toBe(true);
    // After dismiss, no ghost is fed to any chart.
    expect(wrapper.find('.alg-cl-chart--projected').exists()).toBe(false);
  });

  it('Aprovar opens the work-order modal', async () => {
    const wrapper = mountRoom();
    await startRound(wrapper);
    await wrapper.find('.alg-cl-action--approve').trigger('click');
    expect(
      document.querySelector('[data-testid="cl-work-order"]')
    ).not.toBeNull();
    // cleanup teleported node
    document.body.innerHTML = '';
  });

  it('Pedir alternativa swaps the proposal for its canned alternative', async () => {
    const wrapper = mountRoom();
    await startRound(wrapper);
    const before = wrapper.find('.alg-cl-bubble__text').text();
    // Action order is approve [0], alternative [1], dismiss [2].
    const actions = wrapper.findAll('.alg-cl-action');
    await actions[1].trigger('click');
    const after = wrapper.find('.alg-cl-bubble__text').text();
    expect(after).not.toBe(before);
  });

  it('clicking a data pill opens the source report modal', async () => {
    const wrapper = mountRoom();
    await startRound(wrapper);
    const pill = wrapper.find('.alg-cl-pill');
    expect(pill.exists()).toBe(true);
    await pill.trigger('click');
    expect(
      document.querySelector('[data-testid="cl-source-report"]')
    ).not.toBeNull();
    document.body.innerHTML = '';
  });
});

describe('CLevelsBoardroom — E3 ghost simulator wiring', () => {
  it('previewing a proposal feeds a ghost projection to the charts', async () => {
    const wrapper = mountRoom();
    await wrapper.find('.alg-cl-chip').trigger('click');
    // No ghost until a proposal is hovered/focused.
    expect(wrapper.find('.alg-cl-chart--projected').exists()).toBe(false);
    await wrapper.find('.alg-cl-bubble--proposal').trigger('mouseenter');
    expect(wrapper.find('.alg-cl-chart--projected').exists()).toBe(true);
    await wrapper.find('.alg-cl-bubble--proposal').trigger('mouseleave');
    expect(wrapper.find('.alg-cl-chart--projected').exists()).toBe(false);
  });

  it('renders one chart per macro indicator', async () => {
    const wrapper = mountRoom();
    expect(wrapper.findAll('.alg-cl-chart').length).toBe(INDICATORS.length);
  });
});

describe('ProjectionChart geometry', () => {
  function mountChart(props) {
    return mount(ProjectionChart, { props });
  }

  it('draws only the baseline line when no ghost is given', () => {
    const ind = INDICATORS[0];
    const wrapper = mountChart({
      indicator: ind,
      baseline: ind.baseline,
      ghost: null,
    });
    expect(wrapper.find('.alg-cl-chart__line').exists()).toBe(true);
    expect(wrapper.find('.alg-cl-chart__ghost').exists()).toBe(false);
    expect(wrapper.classes()).not.toContain('alg-cl-chart--projected');
  });

  it('draws a dotted ghost path and a delta when a projection is given', () => {
    const debate = debateForGoal('aumentar-margem');
    const proposal = debate.turns.find(t => t.projection);
    const ind = INDICATORS[0];
    const wrapper = mountChart({
      indicator: ind,
      baseline: ind.baseline,
      ghost: proposal.projection[ind.id],
    });
    const ghost = wrapper.find('.alg-cl-chart__ghost');
    expect(ghost.exists()).toBe(true);
    expect(ghost.attributes('d')).toBeTruthy();
    expect(wrapper.find('.alg-cl-chart__delta').exists()).toBe(true);
    expect(wrapper.classes()).toContain('alg-cl-chart--projected');
  });
});

describe('clevels.demo contract', () => {
  it('every projection covers all four indicators', () => {
    ['reduzir-churn', 'cortar-custos', 'aumentar-margem'].forEach(goal => {
      const debate = debateForGoal(goal);
      debate.turns
        .filter(t => t.projection)
        .forEach(t => {
          INDICATORS.forEach(ind => {
            expect(t.projection[ind.id]).toBeDefined();
            expect(t.projection[ind.id].length).toBe(ind.baseline.length);
          });
        });
    });
  });

  it('every proposal carries a work-order key for the Aprovar flow', () => {
    ['reduzir-churn', 'cortar-custos', 'aumentar-margem'].forEach(goal => {
      const debate = debateForGoal(goal);
      debate.turns
        .filter(t => t.proposal)
        .forEach(t => expect(t.workOrderKey).toBeTruthy());
    });
  });
});
