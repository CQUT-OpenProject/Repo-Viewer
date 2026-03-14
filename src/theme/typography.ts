/**
 * 字体排版配置
 */
export const typographyConfig = {
  fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  h1: {
    fontWeight: 400,
    fontSize: "2.5rem",
    lineHeight: 1.2,
    letterSpacing: "-0.01562em",
    "@media (max-width:600px)": {
      fontSize: "2rem",
    },
  },
  h6: {
    fontWeight: 500,
    fontSize: "1.25rem",
    lineHeight: 1.6,
    letterSpacing: "0.0075em",
    "@media (max-width:600px)": {
      fontSize: "1.1rem",
    },
  },
  button: {
    textTransform: "none" as const,
    fontWeight: 500,
  },
  body1: {
    "@media (max-width:600px)": {
      fontSize: "0.875rem",
    },
  },
  body2: {
    "@media (max-width:600px)": {
      fontSize: "0.75rem",
    },
  },
};
