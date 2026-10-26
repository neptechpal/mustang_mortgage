// Data tables ported verbatim from mm-loan-social-generato/loan ad generator.php (admin_js / render_page).

export type Palette = { name: string; c1: string; c1Dark: string; c2: string; c3: string; c2Glow: string; c3Glow: string };

// Enhanced neon palettes with dark base, primary neon, and accent glow colors
export const PALETTES: Palette[] = [
  { name: "Luxury Gold", c1: "#0a0705", c1Dark: "#050302", c2: "#f59e0b", c3: "#fbbf24", c2Glow: "rgba(245,158,11,0.3)", c3Glow: "rgba(251,191,36,0.2)" },
  { name: "Emerald Neon", c1: "#020d0a", c1Dark: "#010605", c2: "#10b981", c3: "#34d399", c2Glow: "rgba(16,185,129,0.35)", c3Glow: "rgba(52,211,153,0.2)" },
  { name: "Royal Purple", c1: "#0d051a", c1Dark: "#06020d", c2: "#a855f7", c3: "#c084fc", c2Glow: "rgba(168,85,247,0.35)", c3Glow: "rgba(192,132,252,0.2)" },
  { name: "Cyber Cyan", c1: "#050d12", c1Dark: "#020609", c2: "#06b6d4", c3: "#22d3ee", c2Glow: "rgba(6,182,212,0.35)", c3Glow: "rgba(34,211,238,0.2)" },
  { name: "Neon Rose", c1: "#12050a", c1Dark: "#090305", c2: "#f43f5e", c3: "#fb7185", c2Glow: "rgba(244,63,94,0.35)", c3Glow: "rgba(251,113,133,0.2)" },
  { name: "Electric Blue", c1: "#05081a", c1Dark: "#02040d", c2: "#3b82f6", c3: "#60a5fa", c2Glow: "rgba(59,130,246,0.35)", c3Glow: "rgba(96,165,250,0.2)" },
  { name: "Midnight Glow", c1: "#080a12", c1Dark: "#040508", c2: "#6366f1", c3: "#818cf8", c2Glow: "rgba(99,102,241,0.3)", c3Glow: "rgba(129,140,248,0.2)" },
  { name: "Hot Pink", c1: "#12050d", c1Dark: "#090306", c2: "#ec4899", c3: "#f472b6", c2Glow: "rgba(236,72,153,0.35)", c3Glow: "rgba(244,114,182,0.2)" },
  { name: "Lime Burst", c1: "#080d05", c1Dark: "#040602", c2: "#84cc16", c3: "#a3e635", c2Glow: "rgba(132,204,22,0.35)", c3Glow: "rgba(163,230,53,0.2)" },
  { name: "Magenta Dream", c1: "#0d050d", c1Dark: "#060306", c2: "#d946ef", c3: "#e879f9", c2Glow: "rgba(217,70,239,0.35)", c3Glow: "rgba(232,121,249,0.2)" },
  { name: "Sunset Orange", c1: "#0d0805", c1Dark: "#060402", c2: "#f97316", c3: "#fb923c", c2Glow: "rgba(249,115,22,0.35)", c3Glow: "rgba(251,146,60,0.2)" },
  { name: "Teal Wave", c1: "#050d0d", c1Dark: "#020606", c2: "#14b8a6", c3: "#2dd4bf", c2Glow: "rgba(20,184,166,0.35)", c3Glow: "rgba(45,212,191,0.2)" },
  { name: "Cherry Red", c1: "#0d0505", c1Dark: "#060202", c2: "#ef4444", c3: "#f87171", c2Glow: "rgba(239,68,68,0.35)", c3Glow: "rgba(248,113,113,0.2)" },
  { name: "Violet Aurora", c1: "#08050d", c1Dark: "#040206", c2: "#8b5cf6", c3: "#a78bfa", c2Glow: "rgba(139,92,246,0.35)", c3Glow: "rgba(167,139,250,0.2)" },
  { name: "Sky Blue", c1: "#050a12", c1Dark: "#020508", c2: "#0ea5e9", c3: "#38bdf8", c2Glow: "rgba(14,165,233,0.35)", c3Glow: "rgba(56,189,248,0.2)" },
  { name: "Neon Green", c1: "#050d05", c1Dark: "#020602", c2: "#22c55e", c3: "#4ade80", c2Glow: "rgba(34,197,94,0.35)", c3Glow: "rgba(74,222,128,0.2)" },
];

/** Emoji-prefixed labels used in the Color Theme <select>. */
export const PALETTE_OPTIONS = [
  "🥇 Luxury Gold",
  "💚 Emerald Neon",
  "💜 Royal Purple",
  "💎 Cyber Cyan",
  "🌹 Neon Rose",
  "⚡ Electric Blue",
  "🌙 Midnight Glow",
  "💗 Hot Pink",
  "🍃 Lime Burst",
  "💖 Magenta Dream",
  "🍊 Sunset Orange",
  "🌊 Teal Wave",
  "❤️ Cherry Red",
  "🔮 Violet Aurora",
  "🌌 Sky Blue",
  "✨ Neon Green",
];

export type StageKey = "approved" | "conditional" | "submitted" | "settled" | "preapproval" | "docs";

export const STAGE_STYLES: Record<StageKey, { label: string; emoji: string; icon: string }> = {
  approved: { label: "APPROVED", emoji: "✅", icon: "fa-solid fa-circle-check" },
  conditional: { label: "CONDITIONAL", emoji: "🟡", icon: "fa-solid fa-clock" },
  submitted: { label: "SUBMITTED", emoji: "📨", icon: "fa-solid fa-paper-plane" },
  settled: { label: "SETTLED", emoji: "🎉", icon: "fa-solid fa-champagne-glasses" },
  preapproval: { label: "PRE-APPROVED", emoji: "🧾", icon: "fa-solid fa-file-circle-check" },
  docs: { label: "DOCS SIGNED", emoji: "✍️", icon: "fa-solid fa-file-signature" },
};

export const STAGE_OPTIONS: { value: StageKey; label: string }[] = [
  { value: "approved", label: "✅ Approved" },
  { value: "conditional", label: "🟡 Conditional" },
  { value: "preapproval", label: "📋 Pre-Approved" },
  { value: "submitted", label: "📨 Submitted" },
  { value: "docs", label: "✍️ Docs Signed" },
  { value: "settled", label: "🎉 Settled" },
];

export type TypeKey = "home" | "refinance" | "invest" | "land" | "asset" | "commercial" | "personal";

export const TYPE_ICONS: Record<TypeKey, string> = {
  home: "fa-solid fa-house-chimney-window",
  refinance: "fa-solid fa-money-bill-transfer",
  invest: "fa-solid fa-chart-line",
  land: "fa-solid fa-tree",
  asset: "fa-solid fa-car-side",
  commercial: "fa-solid fa-building",
  personal: "fa-solid fa-user-tag",
};

export const TYPE_LABELS: Record<TypeKey, string> = {
  home: "Home Loan",
  refinance: "Refinance",
  invest: "Investment Loan",
  land: "Land Purchase",
  asset: "Asset Finance",
  commercial: "Commercial Loan",
  personal: "Personal Loan",
};

// Loan Type select (the plugin's <select> omits "personal").
export const TYPE_OPTIONS: { value: TypeKey; label: string }[] = [
  { value: "home", label: "🏠 Home Loan" },
  { value: "refinance", label: "🔄 Refinance" },
  { value: "invest", label: "📈 Investment" },
  { value: "land", label: "🌳 Land" },
  { value: "asset", label: "🚗 Asset Finance" },
  { value: "commercial", label: "🏢 Commercial" },
];

export type LoanForm = {
  type: TypeKey;
  stage: StageKey;
  lender: string;
  purpose: string;
  location: string;
  occupation: string;
  visa: string;
  facts: string;
  palette: string;
};

export const DEFAULT_FORM: LoanForm = {
  type: "home",
  stage: "approved",
  lender: "",
  purpose: "",
  location: "",
  occupation: "",
  visa: "",
  facts: "",
  palette: "0",
};

export const BRAND = {
  name: "Mustang Mortgage",
  phone: "0416 066 954",
  email: "info@mustangmortgage.com.au",
  tagline: "Home loans made simple",
  logo: "/wp-content/uploads/2024/06/cropped-Copy-of-Financial-Advisor-Logo-in-Dark-Light-Blue-White-Clean-Minimalist-Style-.png",
};

export function buildCaption(data: LoanForm) {
  const stage = STAGE_STYLES[data.stage] || STAGE_STYLES.approved;

  // Happy client intro
  let caption = "🎉 ANOTHER HAPPY CLIENT! ✨";
  caption += "\n\n" + stage.emoji + " " + stage.label + "! " + stage.emoji;

  caption += "\n\n" + (data.purpose || "Successful Home Loan Milestone");
  if (data.lender) caption += " with " + data.lender;
  if (data.location) caption += " in " + data.location + " 📍";

  // Add facts if present
  if (data.facts) {
    caption += "\n\n📋 Quick Facts:";
    const facts = data.facts
      .split(/\r?\n/)
      .filter((x) => x.trim())
      .slice(0, 4);
    facts.forEach((f) => (caption += "\n• " + f.trim()));
  }

  // New CTA message
  caption += "\n\n🏠💫🔑 Need a home loan? Let's make it happen together!";

  // Call to action
  caption += "\n\n💬 Ready to start? DM or contact:";
  caption += "\n📞 0416 066 954\n✉️ info@mustangmortgage.com.au";

  // Footer branding
  caption += "\n\nMUSTANG MORTGAGE\nHome Loans Made Simple";

  // Hashtags
  caption += "\n\n#homeloan #mortgagebroker #finance #approved #realestate #mustangmortgage #happyclient";

  return caption;
}
