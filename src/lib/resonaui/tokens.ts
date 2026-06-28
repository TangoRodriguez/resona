// RESONA design tokens — see UI spec section 3 / 11.

export const colors = {
  bg0: "#02030A",
  bg1: "#050816",
  bg2: "#0A1024",
  bg3: "#101735",

  textPrimary: "#F4F7FF",
  textSecondary: "#A9B7FF",
  textMuted: "#6F789B",
  textFaint: "#3F4867",

  blueCore: "#3B6CFF",
  blueGlow: "#5EA0FF",
  cyanGlow: "#7DE7FF",

  purpleCore: "#7A3DFF",
  violetGlow: "#A06CFF",
  deepViolet: "#4A1D9B",

  magentaAccent: "#FF5AAE",
  recordingDot: "#FF4F91",

  glassFill: "rgba(80, 110, 255, 0.10)",
  glassFillStrong: "rgba(110, 140, 255, 0.18)",
  glassStroke: "rgba(160, 190, 255, 0.42)",

  panelFill: "rgba(8, 12, 28, 0.72)",
  panelFillStrong: "rgba(14, 18, 42, 0.86)",
  panelStroke: "rgba(130, 150, 255, 0.18)",

  buttonBlueStart: "#244DFF",
  buttonBlueEnd: "#567CFF",
  buttonPurpleStart: "#5520B8",
  buttonPurpleEnd: "#9B55FF"
} as const;

export const radius = {
  xs: "8px",
  sm: "12px",
  md: "18px",
  lg: "28px",
  xl: "36px",
  pill: "999px",
  orb: "50%"
} as const;

export const glow = {
  blueSoft: "0 0 24px rgba(80, 130, 255, 0.42)",
  blueStrong: "0 0 48px rgba(80, 130, 255, 0.72)",

  purpleSoft: "0 0 24px rgba(140, 80, 255, 0.42)",
  purpleStrong: "0 0 54px rgba(160, 90, 255, 0.78)",

  cyanSoft: "0 0 24px rgba(125, 231, 255, 0.36)",

  magentaRing: "0 0 36px rgba(255, 90, 174, 0.58)",

  panel: "0 18px 60px rgba(0, 0, 0, 0.45)",
  button: "0 0 32px rgba(88, 112, 255, 0.55)"
} as const;

export const typography = {
  logo: {
    fontSize: "38px",
    letterSpacing: "0.28em",
    fontWeight: 500,
    lineHeight: 1.1
  },
  subtitle: {
    fontSize: "18px",
    letterSpacing: "0.02em",
    fontWeight: 400,
    lineHeight: 1.35
  },
  label: {
    fontSize: "13px",
    letterSpacing: "0.08em",
    fontWeight: 500,
    textTransform: "uppercase"
  },
  body: {
    fontSize: "15px",
    fontWeight: 400,
    lineHeight: 1.5
  },
  button: {
    fontSize: "20px",
    fontWeight: 600,
    lineHeight: 1.2
  },
  timer: {
    fontSize: "44px",
    fontWeight: 400,
    letterSpacing: "0.02em"
  }
} as const;
