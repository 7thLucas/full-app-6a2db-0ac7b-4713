# KYYXBOT — Design Guidelines

## Overall Aesthetic
Dark, sleek, modern. Inspired by terminal/hacker aesthetics but polished. Think dark IDE meets personal AI assistant. Clean typography, high contrast, minimal clutter.

## Color Palette
- Background: near-black (#0d0d0d or #111111)
- Surface/card: dark gray (#1a1a1a or #1e1e1e)
- Primary accent: electric blue or cyan (#00c8ff or #3b82f6)
- Text primary: white or near-white (#f5f5f5)
- Text secondary: muted gray (#888 or #aaa)
- Error/destructive: red (#ef4444)
- Border/divider: subtle (#2a2a2a or #333)

## Typography
- Font: Inter or a clean monospace for code blocks (JetBrains Mono / Fira Code)
- Headings: bold, tight letter-spacing
- Body/chat: comfortable reading size (~15-16px)
- Code blocks: monospace, syntax-highlighted, distinct background

## Layout & Components
- Full-height chat layout: message list scrolls, input pinned to bottom
- Message bubbles: user messages right-aligned (accent color), AI messages left-aligned (dark surface)
- Sidebar (optional): conversation history or settings, collapsible
- Input bar: clean, rounded, with send button and optional file/attachment icon
- Loading state: animated dots or pulse while AI is thinking

## Elevation & Depth
- Subtle borders over box-shadows
- Cards use slightly lighter surface than page background
- Inputs have a subtle inset feel

## Component Notes
- Buttons: rounded, minimal — ghost or filled accent
- Scrollbar: thin, styled to match dark theme
- Mobile-responsive: chat should work well on small screens
- Code blocks: copy button, dark background, colored syntax highlights
