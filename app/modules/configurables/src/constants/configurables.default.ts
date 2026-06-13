/*
 * Default Configurable Data — seeded into Mongo on first boot.
 *
 * BEFORE EDITING: read ./RULES.md (especially R5: schema and defaults must
 * stay in sync) and ./configurables.schema.ts. For per-type schema and
 * default-value samples, see RULES.md §5 "Field Type Reference".
 */

export type TBrandColor = {
  primary: string;
  secondary: string;
  accent: string;
};

export type TDefaultConfigurableData = {
  appName: string;
  logoUrl: string;
  brandColor: TBrandColor;
  tagline?: string;
  welcomeMessage?: string;
  chatPlaceholder?: string;
  systemPrompt?: string;
  allowRegistration?: boolean;
};

export const defaultConfigurablesData: TDefaultConfigurableData = {
  appName: "KYYXBOT",
  logoUrl: "FILL_LOGO_URL_HERE",
  brandColor: {
    primary: "#00c8ff",
    secondary: "#1e1e1e",
    accent: "#3b82f6",
  },
  tagline: "Your private AI assistant", // fill it here
  welcomeMessage: "Hey, I'm KYYXBOT — ask me anything. I'm here to help with questions, code, ideas, or whatever's on your mind.", // fill it here
  chatPlaceholder: "Ask anything...", // fill it here
  systemPrompt: "You are KYYXBOT, a sharp and helpful private AI assistant for a small circle of friends. Be concise, friendly, and direct. You excel at answering questions, writing and debugging code, brainstorming ideas, and general problem solving. When helping with code, always use proper syntax highlighting with markdown code blocks.", // fill it here
  allowRegistration: false, // fill it here — set to true to allow new registrations
};
