// algorythmo: plan 0007 M2-d — Campanhas sub-tab links (D8).
// The Campanhas sub-tab absorbs the former top-level Campaigns surface. The
// upstream campaign routes stay LIVE and unmodified (campaigns.routes.js); we
// only surface their entry points inside the Marketing shell. `routeName` maps
// 1:1 to the live route names:
//   campaigns_ongoing_index  → ongoing (live-chat) campaigns
//   campaigns_one_off_index  → one-off (SMS / WhatsApp) campaigns
// These are the two route families D8 names; we do NOT refactor their URLs.

/**
 * @typedef {Object} CampaignLink
 * @property {string} id         Stable slug for the v-for key.
 * @property {string} labelKey   i18n key for the campaign-type label.
 * @property {string} descKey    i18n key for the one-line description.
 * @property {string} routeName  Live upstream campaign route name.
 */

/** @type {CampaignLink[]} */
export default [
  {
    id: 'ongoing',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.MARKETING.CAMPANHAS.ONGOING_LABEL',
    descKey: 'ALGORYTHMO_ADMIN.SECTORS.MARKETING.CAMPANHAS.ONGOING_DESC',
    routeName: 'campaigns_ongoing_index',
  },
  {
    id: 'one_off',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.MARKETING.CAMPANHAS.ONE_OFF_LABEL',
    descKey: 'ALGORYTHMO_ADMIN.SECTORS.MARKETING.CAMPANHAS.ONE_OFF_DESC',
    routeName: 'campaigns_one_off_index',
  },
];
