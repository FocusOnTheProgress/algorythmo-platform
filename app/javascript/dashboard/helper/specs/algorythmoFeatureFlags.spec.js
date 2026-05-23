import { describe, it, expect } from 'vitest';
import { isAlgorythmoFeatureEnabled } from '../algorythmoFeatureFlags';

describe('isAlgorythmoFeatureEnabled', () => {
  it('returns false when accountFeatures is null', () => {
    expect(isAlgorythmoFeatureEnabled('campaigns', null)).toBe(false);
  });

  it('returns false when accountFeatures is undefined', () => {
    expect(isAlgorythmoFeatureEnabled('campaigns', undefined)).toBe(false);
  });

  it('returns false when accountFeatures is not an object', () => {
    expect(isAlgorythmoFeatureEnabled('campaigns', 'string')).toBe(false);
  });

  it('returns false when the flag is absent from features hash', () => {
    expect(isAlgorythmoFeatureEnabled('campaigns', {})).toBe(false);
  });

  it('returns false when the flag is explicitly false', () => {
    expect(
      isAlgorythmoFeatureEnabled('campaigns', { algorythmo_campaigns: false })
    ).toBe(false);
  });

  it('returns true when the flag is explicitly true', () => {
    expect(
      isAlgorythmoFeatureEnabled('campaigns', { algorythmo_campaigns: true })
    ).toBe(true);
  });

  it('prepends algorythmo_ prefix automatically', () => {
    const features = { algorythmo_help_center: true, help_center: false };
    expect(isAlgorythmoFeatureEnabled('help_center', features)).toBe(true);
  });

  it('is independent per flag — enabling one does not affect another', () => {
    const features = { algorythmo_campaigns: true, algorythmo_macros: false };
    expect(isAlgorythmoFeatureEnabled('campaigns', features)).toBe(true);
    expect(isAlgorythmoFeatureEnabled('macros', features)).toBe(false);
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
      expect(isAlgorythmoFeatureEnabled(flag, {})).toBe(false);
    });
  });
});
