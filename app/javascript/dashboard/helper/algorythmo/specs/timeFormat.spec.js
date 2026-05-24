// algorythmo: feature-gate algorythmo_crm
import {
  elapsedSince,
  humanizeDurationPtBr,
  humanizeDurationLongPtBr,
  timeSinceLabel,
  timeSinceLabelLong,
} from '../timeFormat';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

describe('algorythmo/timeFormat', () => {
  describe('elapsedSince', () => {
    it('returns ms delta for a numeric epoch input', () => {
      expect(elapsedSince(1_000_000, 1_500_000)).toBe(500_000);
    });

    it('parses ISO 8601 strings', () => {
      const now = Date.parse('2026-05-24T12:00:00Z');
      const from = '2026-05-24T11:30:00Z';
      expect(elapsedSince(from, now)).toBe(30 * MINUTE);
    });

    it('accepts a Date instance', () => {
      const now = 2_000_000;
      expect(elapsedSince(new Date(1_500_000), now)).toBe(500_000);
    });

    it('clamps negative deltas (future timestamps, clock skew) to 0', () => {
      expect(elapsedSince(2_000_000, 1_500_000)).toBe(0);
    });

    it('returns null for null input', () => {
      expect(elapsedSince(null)).toBeNull();
    });

    it('returns null for undefined input', () => {
      expect(elapsedSince(undefined)).toBeNull();
    });

    it('returns null for an unparseable string', () => {
      expect(elapsedSince('not a date')).toBeNull();
    });

    it('returns null for an invalid Date instance', () => {
      expect(elapsedSince(new Date('not a date'))).toBeNull();
    });

    it('returns null for non-finite numbers', () => {
      expect(elapsedSince(Number.NaN)).toBeNull();
      expect(elapsedSince(Number.POSITIVE_INFINITY)).toBeNull();
    });
  });

  describe('humanizeDurationPtBr', () => {
    it('returns "agora" for under one minute', () => {
      expect(humanizeDurationPtBr(0)).toBe('agora');
      expect(humanizeDurationPtBr(45 * SECOND)).toBe('agora');
    });

    it('returns minutes for under one hour', () => {
      expect(humanizeDurationPtBr(MINUTE)).toBe('1m');
      expect(humanizeDurationPtBr(45 * MINUTE)).toBe('45m');
    });

    it('returns hours for under one day', () => {
      expect(humanizeDurationPtBr(HOUR)).toBe('1h');
      expect(humanizeDurationPtBr(5 * HOUR)).toBe('5h');
    });

    it('returns days for under one week', () => {
      expect(humanizeDurationPtBr(DAY)).toBe('1d');
      expect(humanizeDurationPtBr(6 * DAY)).toBe('6d');
    });

    it('returns weeks for one week or longer (no month/year escalation)', () => {
      expect(humanizeDurationPtBr(WEEK)).toBe('1sem');
      expect(humanizeDurationPtBr(8 * WEEK)).toBe('8sem');
    });

    it('returns "—" for null or invalid duration', () => {
      expect(humanizeDurationPtBr(null)).toBe('—');
      expect(humanizeDurationPtBr(Number.NaN)).toBe('—');
      expect(humanizeDurationPtBr(Number.POSITIVE_INFINITY)).toBe('—');
    });
  });

  describe('humanizeDurationLongPtBr', () => {
    it('uses "há menos de um minuto" below one minute', () => {
      expect(humanizeDurationLongPtBr(30 * SECOND)).toBe(
        'há menos de um minuto'
      );
    });

    it('singularises 1 minute / 1 hora / 1 dia / 1 semana', () => {
      expect(humanizeDurationLongPtBr(MINUTE)).toBe('há 1 minuto');
      expect(humanizeDurationLongPtBr(HOUR)).toBe('há 1 hora');
      expect(humanizeDurationLongPtBr(DAY)).toBe('há 1 dia');
      expect(humanizeDurationLongPtBr(WEEK)).toBe('há 1 semana');
    });

    it('pluralises above 1 of each unit', () => {
      expect(humanizeDurationLongPtBr(2 * MINUTE)).toBe('há 2 minutos');
      expect(humanizeDurationLongPtBr(3 * HOUR)).toBe('há 3 horas');
      expect(humanizeDurationLongPtBr(4 * DAY)).toBe('há 4 dias');
      expect(humanizeDurationLongPtBr(2 * WEEK)).toBe('há 2 semanas');
    });

    it('returns "tempo desconhecido" for null / non-finite input', () => {
      expect(humanizeDurationLongPtBr(null)).toBe('tempo desconhecido');
      expect(humanizeDurationLongPtBr(Number.NaN)).toBe('tempo desconhecido');
    });
  });

  describe('timeSinceLabel / timeSinceLabelLong', () => {
    it('composes elapsedSince + humanizeDurationPtBr', () => {
      const now = Date.parse('2026-05-24T12:00:00Z');
      const from = '2026-05-24T09:00:00Z';
      expect(timeSinceLabel(from, now)).toBe('3h');
    });

    it('composes elapsedSince + humanizeDurationLongPtBr', () => {
      const now = Date.parse('2026-05-24T12:00:00Z');
      const from = '2026-05-24T09:00:00Z';
      expect(timeSinceLabelLong(from, now)).toBe('há 3 horas');
    });

    it('renders "—" / "tempo desconhecido" for null input', () => {
      expect(timeSinceLabel(null)).toBe('—');
      expect(timeSinceLabelLong(null)).toBe('tempo desconhecido');
    });
  });
});
