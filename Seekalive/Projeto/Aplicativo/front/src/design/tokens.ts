export const tokens = {
  colors: {
    brand: {
      primary: "var(--brand-primary)",
      primaryHover: "var(--brand-primary-hover)",
      primarySubtle: "var(--brand-primary-subtle)",
      glow: "var(--brand-glow)",
    },
    surface: {
      app: "var(--surface-app)",
      card: "var(--surface-card)",
      raised: "var(--surface-raised)",
      border: "var(--surface-border)",
    },
    text: {
      primary: "var(--text-primary)",
      secondary: "var(--text-secondary)",
      muted: "var(--text-muted)",
    },
    state: {
      success: "var(--state-success)",
      warning: "var(--state-warning)",
      danger: "var(--state-danger)",
      info: "var(--state-info)",
    },
  },

  radius: {
    sm: "var(--seekalive-radius-sm)",
    md: "var(--seekalive-radius-md)",
    lg: "var(--seekalive-radius-lg)",
    xl: "1.5rem",
    full: "9999px",
  },

  spacing: {
    pagePaddingX: "var(--space-page-padding-x)",
    sectionGap: "var(--space-section-gap)",
    cardPadding: "var(--space-card-padding)",
    itemGap: "var(--space-item-gap)",
  },

  typography: {
    display: { fontSize: "var(--font-size-display)", fontWeight: "var(--font-weight-display)", lineHeight: "var(--line-height-display)" },
    pageTitle: { fontSize: "var(--font-size-page-title)", fontWeight: "var(--font-weight-page-title)", lineHeight: "var(--line-height-page-title)" },
    sectionTitle: { fontSize: "var(--font-size-section-title)", fontWeight: "var(--font-weight-section-title)", lineHeight: "var(--line-height-section-title)" },
    body: { fontSize: "var(--font-size-body)", fontWeight: "400", lineHeight: "var(--line-height-body)" },
    bodySm: { fontSize: "var(--font-size-body-sm)", fontWeight: "400", lineHeight: "var(--line-height-body-sm)" },
    caption: { fontSize: "var(--font-size-caption)", fontWeight: "400", lineHeight: "var(--line-height-caption)" },
    meta: { fontSize: "var(--font-size-meta)", fontWeight: "var(--font-weight-meta)", lineHeight: "var(--line-height-meta)" },
  },

  shadows: {
    card: "var(--shadow-card)",
    cardHover: "var(--shadow-card-hover)",
    brandGlow: "var(--brand-glow)",
    brandGlowLg: "var(--brand-glow-lg)",
  },
} as const;

export type ColorToken = keyof typeof tokens.colors;
export type RadiusToken = keyof typeof tokens.radius;
export type SpacingToken = keyof typeof tokens.spacing;
export type TypographyToken = keyof typeof tokens.typography;
