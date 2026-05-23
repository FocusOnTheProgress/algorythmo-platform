/**
 * algorythmo: i18n-overlay-m0
 *
 * Verifies that the Algorythmo OS brand overlay is applied correctly to the
 * merged locale messages. After the deep-merge, no user-visible string in the
 * en or pt_BR locale should contain the literal "Chatwoot".
 *
 * Spot-checks the highest-risk keys identified during the M0 audit.
 */

import { deepMerge } from 'engines/algorythmo/app/javascript/i18n/deepMerge';
import enBase from './locale/en';
import pt_BRBase from './locale/pt_BR';
import enOverrides from 'engines/algorythmo/app/javascript/i18n/overrides/en.json';
import ptBROverrides from 'engines/algorythmo/app/javascript/i18n/overrides/pt_BR.json';

const en = deepMerge(enBase, enOverrides);
const pt_BR = deepMerge(pt_BRBase, ptBROverrides);

// Vue i18n placeholders like {latestChatwootVersion} are variable names that
// Vue substitutes at render time. They are never user-visible. Strip them
// before asserting against the literal "Chatwoot" brand word.
const visibleText = s => (s ?? '').replace(/\{[^}]+\}/g, '');

describe('Algorythmo OS i18n overlay — en', () => {
  it('UPDATE_CHATWOOT does not mention Chatwoot', () => {
    expect(visibleText(en.GENERAL_SETTINGS.UPDATE_CHATWOOT)).not.toContain(
      'Chatwoot'
    );
    expect(en.GENERAL_SETTINGS.UPDATE_CHATWOOT).toContain('Algorythmo OS');
  });

  it('PAYMENT_PENDING does not mention Chatwoot', () => {
    expect(visibleText(en.GENERAL_SETTINGS.PAYMENT_PENDING)).not.toContain(
      'Chatwoot'
    );
  });

  it('UPGRADE does not mention Chatwoot', () => {
    expect(visibleText(en.GENERAL_SETTINGS.UPGRADE)).not.toContain('Chatwoot');
  });

  it('LIMITS_UPGRADE does not mention Chatwoot', () => {
    expect(visibleText(en.GENERAL_SETTINGS.LIMITS_UPGRADE)).not.toContain(
      'Chatwoot'
    );
  });

  it('BRANDING_TEXT (widget builder) does not mention Chatwoot', () => {
    expect(
      visibleText(en.INBOX_MGMT.WIDGET_BUILDER.BRANDING_TEXT)
    ).not.toContain('Chatwoot');
    expect(en.INBOX_MGMT.WIDGET_BUILDER.BRANDING_TEXT).toContain(
      'Algorythmo OS'
    );
  });

  it('LOGIN.TITLE does not mention Chatwoot', () => {
    expect(visibleText(en.LOGIN.TITLE)).not.toContain('Chatwoot');
    expect(en.LOGIN.TITLE).toContain('Algorythmo OS');
  });

  it('REGISTER.GET_STARTED does not mention Chatwoot', () => {
    expect(visibleText(en.REGISTER.GET_STARTED)).not.toContain('Chatwoot');
  });

  it('AUDIT_LOGS.SIDEBAR_TXT does not mention Chatwoot', () => {
    expect(visibleText(en.AUDIT_LOGS.SIDEBAR_TXT)).not.toContain('Chatwoot');
  });

  it('AUDIT_LOGS.LIST.DESC does not mention Chatwoot', () => {
    expect(visibleText(en.AUDIT_LOGS.LIST.DESC)).not.toContain('Chatwoot');
  });

  it('INTEGRATION_SETTINGS.DESCRIPTION does not mention Chatwoot', () => {
    expect(visibleText(en.INTEGRATION_SETTINGS.DESCRIPTION)).not.toContain(
      'Chatwoot'
    );
  });

  it('INTEGRATION_SETTINGS.WEBHOOK.FORM.DESC does not mention Chatwoot', () => {
    expect(
      visibleText(en.INTEGRATION_SETTINGS.WEBHOOK.FORM.DESC)
    ).not.toContain('Chatwoot');
  });

  it('INTEGRATION_SETTINGS.WEBHOOK.SIDEBAR_TXT does not mention Chatwoot', () => {
    expect(
      visibleText(en.INTEGRATION_SETTINGS.WEBHOOK.SIDEBAR_TXT)
    ).not.toContain('Chatwoot');
  });

  it('INTEGRATION_SETTINGS.SLACK.HELP_TEXT.BODY does not mention Chatwoot', () => {
    expect(
      visibleText(en.INTEGRATION_SETTINGS.SLACK.HELP_TEXT.BODY)
    ).not.toContain('Chatwoot');
  });

  it('INTEGRATION_SETTINGS.SLACK.SELECT_CHANNEL.DESCRIPTION does not mention Chatwoot', () => {
    expect(
      visibleText(en.INTEGRATION_SETTINGS.SLACK.SELECT_CHANNEL.DESCRIPTION)
    ).not.toContain('Chatwoot');
  });

  it('INTEGRATION_SETTINGS.DASHBOARD_APPS.SIDEBAR_TXT does not mention Chatwoot', () => {
    expect(
      visibleText(en.INTEGRATION_SETTINGS.DASHBOARD_APPS.SIDEBAR_TXT)
    ).not.toContain('Chatwoot');
  });

  it('LABEL_MGMT.SUGGESTIONS.POWERED_BY does not mention Chatwoot', () => {
    expect(visibleText(en.LABEL_MGMT.SUGGESTIONS.POWERED_BY)).not.toContain(
      'Chatwoot'
    );
    expect(en.LABEL_MGMT.SUGGESTIONS.POWERED_BY).toContain('Algorythmo AI');
  });

  it('MFA_VERIFICATION.HELP_MODAL.CONTACT_DESC_CLOUD does not mention Chatwoot', () => {
    expect(
      visibleText(en.MFA_VERIFICATION.HELP_MODAL.CONTACT_DESC_CLOUD)
    ).not.toContain('Chatwoot');
  });

  it('RESET_PASSWORD.DESCRIPTION does not mention Chatwoot', () => {
    expect(visibleText(en.RESET_PASSWORD.DESCRIPTION)).not.toContain(
      'Chatwoot'
    );
  });

  it('PROFILE_SETTINGS.INTERFACE_SECTION.NOTE does not mention Chatwoot', () => {
    expect(
      visibleText(en.PROFILE_SETTINGS.INTERFACE_SECTION.NOTE)
    ).not.toContain('Chatwoot');
  });

  it('SECURITY_SETTINGS.SAML.SP_ENTITY_ID.TOOLTIP does not mention Chatwoot', () => {
    expect(
      visibleText(en.SECURITY_SETTINGS.SAML.SP_ENTITY_ID.TOOLTIP)
    ).not.toContain('Chatwoot');
  });

  it('CREATE_ACCOUNT.NO_ACCOUNT_WARNING does not mention Chatwoot', () => {
    expect(visibleText(en.CREATE_ACCOUNT.NO_ACCOUNT_WARNING)).not.toContain(
      'Chatwoot'
    );
  });

  it('YEAR_IN_REVIEW.SHARE_MODAL.SHARE_TEXT does not mention Chatwoot', () => {
    expect(visibleText(en.YEAR_IN_REVIEW.SHARE_MODAL.SHARE_TEXT)).not.toContain(
      'Chatwoot'
    );
  });

  it('YEAR_IN_REVIEW.SHARE_MODAL.BRANDING does not mention Chatwoot', () => {
    expect(visibleText(en.YEAR_IN_REVIEW.SHARE_MODAL.BRANDING)).not.toContain(
      'Chatwoot'
    );
  });

  it('HELP_CENTER.CREATE_PORTAL_DIALOG.NAME.PLACEHOLDER does not mention Chatwoot', () => {
    expect(
      visibleText(en.HELP_CENTER.CREATE_PORTAL_DIALOG.NAME.PLACEHOLDER)
    ).not.toContain('Chatwoot');
  });

  it('CONVERSATION.NATIVE_APP_ADVISORY does not mention Chatwoot', () => {
    expect(visibleText(en.CONVERSATION.NATIVE_APP_ADVISORY)).not.toContain(
      'Chatwoot'
    );
  });

  it('INBOX_MGMT.CREATE_FLOW.CHANNEL.BODY does not mention Chatwoot', () => {
    expect(visibleText(en.INBOX_MGMT.CREATE_FLOW.CHANNEL.BODY)).not.toContain(
      'Chatwoot'
    );
  });

  it('INBOX_MGMT.ADD.AUTH.DESC does not mention Chatwoot', () => {
    expect(visibleText(en.INBOX_MGMT.ADD.AUTH.DESC)).not.toContain('Chatwoot');
  });

  it('upstream keys not in overrides are still present (deepMerge preserves base)', () => {
    // LOGIN.EMAIL.LABEL is upstream-only — must survive the merge
    expect(en.LOGIN.EMAIL.LABEL).toBe('Email');
    // INBOX_MGMT.HEADER is upstream-only
    expect(en.INBOX_MGMT.HEADER).toBe('Inboxes');
  });
});

describe('Algorythmo OS i18n overlay — pt_BR', () => {
  it('LOGIN.TITLE does not mention Chatwoot', () => {
    expect(visibleText(pt_BR.LOGIN?.TITLE)).not.toContain('Chatwoot');
  });

  it('REGISTER.GET_STARTED does not mention Chatwoot', () => {
    expect(visibleText(pt_BR.REGISTER?.GET_STARTED)).not.toContain('Chatwoot');
  });

  it('INBOX_MGMT.WIDGET_BUILDER.BRANDING_TEXT does not mention Chatwoot', () => {
    expect(
      visibleText(pt_BR.INBOX_MGMT?.WIDGET_BUILDER?.BRANDING_TEXT)
    ).not.toContain('Chatwoot');
  });
});
