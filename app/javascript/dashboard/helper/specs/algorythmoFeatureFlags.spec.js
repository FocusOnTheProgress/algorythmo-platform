import { describe, it, expect } from 'vitest';
import { isAlgorythmoCutEnabled } from '../algorythmoFeatureFlags';

describe('isAlgorythmoCutEnabled', () => {
  it('returns false when cutFlags is null', () => {
    expect(isAlgorythmoCutEnabled('campaigns', null)).toBe(false);
  });

  it('returns false when cutFlags is undefined', () => {
    expect(isAlgorythmoCutEnabled('campaigns', undefined)).toBe(false);
  });

  it('returns false when cutFlags is not an object', () => {
    expect(isAlgorythmoCutEnabled('campaigns', 'string')).toBe(false);
  });

  it('returns false when the flag is absent from the hash', () => {
    expect(isAlgorythmoCutEnabled('campaigns', {})).toBe(false);
  });

  it('returns false when the flag is explicitly false', () => {
    expect(isAlgorythmoCutEnabled('campaigns', { campaigns: false })).toBe(
      false
    );
  });

  it('returns true when the flag is explicitly true', () => {
    expect(isAlgorythmoCutEnabled('campaigns', { campaigns: true })).toBe(true);
  });

  it('uses the flag name as-is (no prefix prepended)', () => {
    const flags = { help_center: true, algorythmo_help_center: false };
    expect(isAlgorythmoCutEnabled('help_center', flags)).toBe(true);
  });

  it('is independent per flag — enabling one does not affect another', () => {
    const flags = { campaigns: true, macros: false };
    expect(isAlgorythmoCutEnabled('campaigns', flags)).toBe(true);
    expect(isAlgorythmoCutEnabled('macros', flags)).toBe(false);
  });

  it('covers all 13 CUT flags returning false by default', () => {
    const flags = [
      'campaigns',
      'help_center',
      'sla',
      'audit_logs',
      'custom_roles',
      'security_settings',
      'billing_settings',
      'agent_bots',
      'macros',
      'dashboard_apps',
      'advanced_assignment',
      'reports_bot',
      'conversation_workflow',
    ];
    flags.forEach(flag => {
      expect(isAlgorythmoCutEnabled(flag, {})).toBe(false);
    });
  });
});
