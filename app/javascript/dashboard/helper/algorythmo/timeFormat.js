// algorythmo: feature-gate algorythmo_crm
// Time humanization helpers for the CRM Kanban surface.
//
// All output is locale-pt-BR by founder decision (Q-B6 in plan 0002):
// upstream Chatwoot fallback handles other locales. We intentionally do NOT
// depend on dayjs/luxon to keep the LeadCard render path allocation-free —
// each LeadCard renders timeHuman once on mount and on every stage move, so
// a 4-line pure function beats a 10kb relative-time library for this scope.

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

const toMilliseconds = input => {
  if (input == null) return null;
  if (input instanceof Date) {
    const t = input.getTime();
    return Number.isFinite(t) ? t : null;
  }
  if (typeof input === 'number') {
    return Number.isFinite(input) ? input : null;
  }
  if (typeof input === 'string') {
    const parsed = Date.parse(input);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

// Returns the elapsed wall-clock time in milliseconds between `fromInput`
// and `now`. Negative deltas (future timestamps from clock skew) are
// clamped to 0 — a card "entered the stage 30 seconds in the future" should
// render as "agora", not "-30s".
export const elapsedSince = (fromInput, now = Date.now()) => {
  const fromMs = toMilliseconds(fromInput);
  if (fromMs == null) return null;
  const delta = now - fromMs;
  return delta < 0 ? 0 : delta;
};

// Returns the pt_BR human label for a given duration in ms. Compact form
// optimized for the card footer ("12m", "3h", "2d", "5sem"). Values larger
// than 4 weeks round to weeks, not months — Lead-aging beyond a month is
// already past the "red" threshold for any reasonable pipeline stage, so
// finer-grained labels (month/year) would be misleading product affordance.
export const humanizeDurationPtBr = ms => {
  if (ms == null || !Number.isFinite(ms)) return '—';
  if (ms < MINUTE) return 'agora';
  if (ms < HOUR) return `${Math.floor(ms / MINUTE)}m`;
  if (ms < DAY) return `${Math.floor(ms / HOUR)}h`;
  if (ms < WEEK) return `${Math.floor(ms / DAY)}d`;
  return `${Math.floor(ms / WEEK)}sem`;
};

// Convenience: takes an ISO timestamp (or null) and returns the human label.
// Returns '—' for null/invalid input so the card can render a stable layout
// even when the backend has not yet populated `stage_entered_at`.
export const timeSinceLabel = (fromInput, now = Date.now()) =>
  humanizeDurationPtBr(elapsedSince(fromInput, now));

// Long-form pt_BR label for aria-label / screen-reader output. The card
// announces "Lead {name}, etapa {stage}, há 2 horas nesta etapa". Concrete
// numeric values are spelled out so a screen reader doesn't say "letter m".
export const humanizeDurationLongPtBr = ms => {
  if (ms == null || !Number.isFinite(ms)) return 'tempo desconhecido';
  if (ms < MINUTE) return 'há menos de um minuto';
  if (ms < HOUR) {
    const n = Math.floor(ms / MINUTE);
    return n === 1 ? 'há 1 minuto' : `há ${n} minutos`;
  }
  if (ms < DAY) {
    const n = Math.floor(ms / HOUR);
    return n === 1 ? 'há 1 hora' : `há ${n} horas`;
  }
  if (ms < WEEK) {
    const n = Math.floor(ms / DAY);
    return n === 1 ? 'há 1 dia' : `há ${n} dias`;
  }
  const n = Math.floor(ms / WEEK);
  return n === 1 ? 'há 1 semana' : `há ${n} semanas`;
};

export const timeSinceLabelLong = (fromInput, now = Date.now()) =>
  humanizeDurationLongPtBr(elapsedSince(fromInput, now));
