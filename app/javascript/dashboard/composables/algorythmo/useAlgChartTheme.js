// algorythmo: Cinematic OS — chart theme bridge (Stream E, plan 0011).
//
// Chart.js paints to a <canvas>, so CSS custom properties don't reach the
// stroke/fill — the colours must be passed as literal JS strings. The 8 sector
// sub-tab panes hardcoded a WHITE line (`rgba(255,255,255,.72)`) + white fill,
// which is invisible on the paper canvas. This composable returns theme-reactive
// line/fill colours: white tiers in the dark command room, ink tiers on paper.
//
// It resolves the colour off the live `--alg-fg-*` token (so it always tracks
// the token system) and re-reads when the active theme attribute changes
// (MutationObserver on <html data-theme>). Falls back to safe literals when the
// DOM / computed style is unavailable (SSR, vitest jsdom without styles).
import { ref, onMounted, onBeforeUnmount } from 'vue';

const WHITE_LINE = 'rgba(255, 255, 255, 0.72)';
const WHITE_FILL = 'rgba(255, 255, 255, 0.06)';
const INK_LINE = 'rgba(12, 12, 14, 0.72)';
const INK_FILL = 'rgba(12, 12, 14, 0.06)';

const isPaperTheme = () => {
  if (typeof document === 'undefined') return false;
  return document.documentElement.getAttribute('data-theme') === 'white';
};

export function useAlgChartTheme() {
  const lineColor = ref(WHITE_LINE);
  const fillColor = ref(WHITE_FILL);

  const sync = () => {
    const paper = isPaperTheme();
    lineColor.value = paper ? INK_LINE : WHITE_LINE;
    fillColor.value = paper ? INK_FILL : WHITE_FILL;
  };

  let observer = null;

  onMounted(() => {
    sync();
    if (
      typeof MutationObserver === 'undefined' ||
      typeof document === 'undefined'
    )
      return;
    observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
  });

  onBeforeUnmount(() => {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  });

  return { lineColor, fillColor };
}
