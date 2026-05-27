// algorythmo: M6 PR-6b — Sector mock contract (single source of truth).
// Six sectors (M6.1-M6.6) fan out from this shape. Any drift here is a
// six-place silent break — keep the contract explicit and the values plain.
//
// Hard rules for sector mocks:
//   - Values are pre-formatted strings ("R$ 487.300", "42 dias"). Locale is
//     pt-BR for now; en-US fan-out is a separate task.
//   - Delta `text` is a plain string. NEVER HTML. If you need a styled suffix
//     ("pp", "%", "↑"), use a Unicode glyph or extend the contract — do not
//     reach for v-html.
//   - Delta `glyph` is a single Unicode arrow (▲ / ▼ / —). No colored chips.
//   - Chart `labels` and `data` arrays must have the same length.
//   - 4 secondary KPIs exactly (the magazine layout is `repeat(4, 1fr)`).

/**
 * @typedef {Object} SectorDelta
 * @property {'▲'|'▼'|'—'} glyph     Direction-only Unicode glyph.
 * @property {string}      text      Plain string. No HTML. Already formatted.
 */

/**
 * @typedef {Object} SectorKpi
 * @property {string}      labelKey  i18n key for the KPI label.
 * @property {string}      value     Pre-formatted display value.
 * @property {SectorDelta} [delta]   Optional period-over-period delta.
 */

/**
 * @typedef {Object} SectorChart
 * @property {'line'|'pie'} type
 * @property {string}       titleKey
 * @property {string[]}     labels    Same length as `data`.
 * @property {number[]}     data
 */

/**
 * @typedef {Object} SectorMock
 * @property {string}        id            Stable slug (matches route segment).
 * @property {string}        headingKey    i18n key for the page heading.
 * @property {string}        contextKey    i18n key for the editorial sub-line.
 * @property {SectorKpi[]}   anchorKpis    Exactly 2 anchors.
 * @property {SectorKpi[]}   secondaryKpis Exactly 4 secondaries.
 * @property {SectorChart}   [chart]
 */

export const SECTOR_MOCK_VERSION = 1;
