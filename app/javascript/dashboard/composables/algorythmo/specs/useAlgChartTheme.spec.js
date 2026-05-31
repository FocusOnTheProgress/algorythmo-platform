// algorythmo: Stream E (plan 0011) — useAlgChartTheme unit spec.
//
// Chart.js paints to canvas, so the sector sub-tab line/fill colours are passed
// as literal JS strings. They MUST flip white→ink when the OS switches to the
// paper register, or the 12-week trend line is invisible on the light canvas.
// This spec locks that the composable returns INK under data-theme='white',
// WHITE otherwise, and reacts to a live attribute change.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { defineComponent } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { useAlgChartTheme } from '../useAlgChartTheme';

const Harness = defineComponent({
  setup() {
    return useAlgChartTheme();
  },
  template: '<div>{{ lineColor }}|{{ fillColor }}</div>',
});

describe('useAlgChartTheme', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
  });

  it('returns white tiers in the dark command room (no paper attribute)', () => {
    const wrapper = mount(Harness);
    expect(wrapper.vm.lineColor).toBe('rgba(255, 255, 255, 0.72)');
    expect(wrapper.vm.fillColor).toBe('rgba(255, 255, 255, 0.06)');
  });

  it("returns ink tiers under data-theme='white' (paper)", () => {
    document.documentElement.setAttribute('data-theme', 'white');
    const wrapper = mount(Harness);
    expect(wrapper.vm.lineColor).toBe('rgba(12, 12, 14, 0.72)');
    expect(wrapper.vm.fillColor).toBe('rgba(12, 12, 14, 0.06)');
  });

  it('returns white tiers under data-theme=dark', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    const wrapper = mount(Harness);
    expect(wrapper.vm.lineColor).toBe('rgba(255, 255, 255, 0.72)');
  });

  it('reacts when the active theme attribute changes at runtime', async () => {
    const wrapper = mount(Harness);
    expect(wrapper.vm.lineColor).toBe('rgba(255, 255, 255, 0.72)');

    document.documentElement.setAttribute('data-theme', 'white');
    // MutationObserver callbacks fire on a microtask.
    await flushPromises();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(wrapper.vm.lineColor).toBe('rgba(12, 12, 14, 0.72)');
    expect(wrapper.vm.fillColor).toBe('rgba(12, 12, 14, 0.06)');
  });
});
