// algorythmo: G1 cinematic-os — onboarding cards purge spec.
// Verifies that the four Chatwoot onboarding cards (create inbox / invite team /
// canned responses / labels) have been removed from OnboardingView.vue and that
// the component no longer imports or renders OnboardingFeatureCard.

import fs from 'node:fs';
import path from 'node:path';

const VIEW_PATH = path.resolve(__dirname, '..', 'OnboardingView.vue');
const source = fs.readFileSync(VIEW_PATH, 'utf8');

describe('OnboardingView Chatwoot card purge (G1)', () => {
  it('does not import OnboardingFeatureCard', () => {
    expect(source).not.toContain('import OnboardingFeatureCard');
  });

  it('does not render OnboardingFeatureCard in the template', () => {
    // Extract template block to be precise
    const templateStart = source.indexOf('<template>');
    const template = templateStart >= 0 ? source.slice(templateStart) : source;
    expect(template).not.toContain('OnboardingFeatureCard');
    expect(template).not.toContain('onboarding-feature-card');
  });

  it('does not reference Chatwoot-specific onboarding routes', () => {
    const templateStart = source.indexOf('<template>');
    const template = templateStart >= 0 ? source.slice(templateStart) : source;
    // These routes are Chatwoot brand content and must not appear
    expect(template).not.toContain('settings_inbox_new');
    expect(template).not.toContain('settings_teams_new');
    expect(template).not.toContain('canned_list');
    expect(template).not.toContain('labels_list');
  });

  it('still renders the greeting message (brand-neutral copy is preserved)', () => {
    const templateStart = source.indexOf('<template>');
    const template = templateStart >= 0 ? source.slice(templateStart) : source;
    // The greeting composable output and the description copy must still be present
    expect(template).toContain('greetingMessage');
    expect(template).toContain('ONBOARDING.DESCRIPTION');
  });
});
