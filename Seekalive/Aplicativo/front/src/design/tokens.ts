export const tokens = {
  colors: {
    brand: {
      primary: "hsl(24 95% 53%)",
      primaryHover: "hsl(24 95% 46%)",
      primarySubtle: "hsl(24 95% 53% / 0.12)",
      glow: "0 0 20px hsl(24 95% 53% / 0.3)",
    },
    surface: {
      app: "hsl(225 20% 5%)",
      card: "hsl(225 20% 8%)",
      raised: "hsl(225 20% 11%)",
      border: "hsl(225 20% 13%)",
    },
    text: {
      primary: "hsl(210 15% 96%)",
      secondary: "hsl(225 12% 68%)",
      muted: "hsl(225 12% 52%)",
    },
    state: {
      success: "hsl(142 71% 45%)",
      warning: "hsl(38 92% 50%)",
      danger: "hsl(0 84% 60%)",
      info: "hsl(210 90% 58%)",
    },
  },

  radius: {
    sm: "0.5rem",
    md: "0.75rem",
    lg: "1rem",
    xl: "1.5rem",
    full: "9999px",
  },

  spacing: {
    pagePaddingX: "1rem",
    sectionGap: "1.5rem",
    cardPadding: "1rem",
    itemGap: "0.75rem",
  },

  typography: {
    display: { fontSize: "2rem", fontWeight: "800", lineHeight: "1.1" },
    pageTitle: { fontSize: "1.5rem", fontWeight: "700", lineHeight: "1.2" },
    sectionTitle: { fontSize: "1.125rem", fontWeight: "600", lineHeight: "1.3" },
    body: { fontSize: "0.9375rem", fontWeight: "400", lineHeight: "1.6" },
    bodySm: { fontSize: "0.875rem", fontWeight: "400", lineHeight: "1.5" },
    caption: { fontSize: "0.75rem", fontWeight: "400", lineHeight: "1.4" },
    meta: { fontSize: "0.6875rem", fontWeight: "500", lineHeight: "1.3" },
  },

  shadows: {
    card: "0 1px 3px hsl(0 0% 0% / 0.3)",
    cardHover: "0 4px 12px hsl(0 0% 0% / 0.4)",
    brandGlow: "0 0 20px hsl(24 95% 53% / 0.3)",
    brandGlowLg: "0 0 32px hsl(24 95% 53% / 0.4)",
  },
} as const;

export type ColorToken = keyof typeof tokens.colors;
export type RadiusToken = keyof typeof tokens.radius;
