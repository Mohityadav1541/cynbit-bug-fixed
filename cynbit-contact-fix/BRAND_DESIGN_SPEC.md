# Cynbit Brand & Design System Specification

**Target Product:** Cynbit Technologies Official Web Architecture  
**Reference Source:** Production `https://www.cynbit.in/` and `https://www.cynbit.in/contact`  
**Inspected Date:** November 1, 2026  
**Auditor:** Antigravity Senior Engineering & Design Architecture  

---

## 1. Executive Visual & Brand Audit

A comprehensive live audit was performed against the production Next.js 15 deployment of Cynbit (`https://www.cynbit.in/`). By decompiling the production CSS bundles (`ab1584e3d32cd2d2.css` and `2111bc7b10569bdd.css`), the exact design tokens, color palette, typography hierarchy, border radii, shadows, and component structures were extracted.

### Brand Personality & Core Aesthetic
- **Tone:** Technical Precision, Enterprise Architecture, Autonomous AI Systems, Modern Engineering Rigor.
- **Visual Style:** Light, airy, clean architectural surfaces (`#f7fafa`) with deep emerald/teal accentuation (`#006067`), high-contrast dark text (`#181c1d`), subtle border lines (`rgba(189, 201, 202, 0.15)`), and spacious, rounded containers (`rounded-[3rem]`).
- **Antithesis (What Cynbit is NOT):** Cynbit does **not** use generic dark-purple neon gradients, floating glow orbs, heavy glassmorphism cards, or template-like SaaS cards. It uses Material You / M3 inspired tonal surfaces with custom luxury finishes.

---

## 2. Verified Color Palette & Tokens

All values below are verified from Cynbit's production CSS theme layers:

| Token Name | Hex / Value | Role / Usage on Cynbit.in |
| :--- | :--- | :--- |
| `--color-primary` | `#006067` | Deep Architectural Teal — Primary buttons, active states, key icons, brand accent |
| `--color-on-primary` | `#ffffff` | Pure White — Text and icons on primary backgrounds |
| `--color-primary-container`| `#007b83` | Medium Teal — Hover state for primary buttons, container accents |
| `--color-on-primary-container` | `#d0fbff` | Light Aqua — Text on primary containers |
| `--color-primary-fixed` | `#96f1fa` | Cyan Highlight — Fixed accents and chips |
| `--color-secondary` | `#12629d` | Deep Tech Blue — Secondary accents, code badges, system status |
| `--color-secondary-container` | `#80bdfe` | Soft Sky Blue — Active highlights |
| `--color-tertiary` | `#774e00` | Warm Bronze / Amber — Status badges (e.g. "Inquiry Hub"), priority tags |
| `--color-tertiary-fixed` | `#ffddb3` | Light Warm Amber — Badge background pills (`bg-tertiary-fixed`) |
| `--color-on-tertiary-fixed` | `#291800` | Dark Bronze — Badge text (`text-on-tertiary-fixed`) |
| `--color-surface` | `#f7fafa` | Primary Page Background (`bg-surface`) |
| `--color-surface-container-lowest` | `#ffffff` | Pure White — Card backgrounds, modal surfaces, form containers |
| `--color-surface-container-low` | `#f1f4f4` | Muted Off-White — Form inputs, select dropdowns, inactive pills |
| `--color-surface-container` | `#ebeeee` | Soft Neutral — Divider strips, subtle chip backgrounds |
| `--color-surface-container-high` | `#e6e9e9` | Elevated Neutral — Hover backgrounds, secondary cards |
| `--color-surface-container-highest` | `#e0e3e3` | Active neutral controls |
| `--color-on-surface` | `#181c1d` | High-contrast Black/Charcoal — Primary headings, titles, active labels |
| `--color-on-surface-variant` | `#3e494a` | Slate Charcoal — Subtext, body descriptions, field placeholders |
| `--color-outline` | `#6e797a` | Medium Neutral — Focus boundaries, secondary borders |
| `--color-outline-variant` | `#bdc9ca` | Subtle Border Divider (`border-outline-variant/10` or `/15`) |
| `--color-error` | `#ba1a1a` | Crimson Red — Form validation errors, network failure warnings |
| `--color-error-container` | `#ffdad6` | Soft Pink/Red — Error alert background |

---

## 3. Typography & Heading Hierarchy

Cynbit loads two primary typefaces:

1. **Headline Font (`font-headline`):**
   - **Family:** `Plus Jakarta Sans`, sans-serif
   - **Weights:** 700 (Bold), 800 (ExtraBold), 900 (Black)
   - **Style:** Frequently paired with `tracking-tighter` and `italic` for punchy, modern architectural statements (e.g. `Start Your Next Project With Us`, `The Blueprint.`).

2. **Body Font (`font-body`):**
   - **Family:** `Manrope`, sans-serif
   - **Weights:** 400 (Regular), 500 (Medium), 600 (SemiBold)
   - **Style:** Open, legible, balanced line heights (`leading-relaxed`), used for descriptions, form inputs, and labels.

3. **Mono / Code Font (`font-mono`):**
   - **Family:** `JetBrains Mono` / system monospace (`ui-monospace, Menlo, Monaco, Consolas`)
   - **Usage:** Technical payloads, budget numbers, audit references, code diffs.

### Verified Text Styles & Classes

```css
/* Hero / Display Title */
font-headline font-black text-4xl md:text-6xl lg:text-7xl xl:text-8xl tracking-tighter leading-[1.1] text-on-surface italic

/* Section Heading */
font-headline font-black text-3xl md:text-5xl tracking-tighter text-on-surface italic

/* Gradient Text Span */
.text-gradient-primary {
  color: transparent;
  background-image: linear-gradient(135deg, #006067, #007b83);
  -webkit-background-clip: text;
  background-clip: text;
}

/* Category Badge Pill */
inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-bold text-[10px] uppercase tracking-widest border border-tertiary/20

/* Form Label */
text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 ml-4

/* Body Subtext */
font-body text-base md:text-lg text-on-surface-variant leading-relaxed font-medium opacity-80
```

---

## 4. Components & Layout Patterns

### 4.1 Header & Navigation
- **Height / Padding:** `px-4 md:px-8 py-4 md:py-5`, fixed at top with `z-[100]`.
- **Background:** `glass-nav` — `background-color: color-mix(in oklab, var(--color-surface) 80%, transparent); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(189, 201, 202, 0.1)`.
- **Max Width:** `max-w-screen-2xl mx-auto`.
- **Logo:** Official Cynbit SVG vector mark, height `h-8 md:h-10 w-auto`, smooth hover scale `hover:scale-105 active:scale-95 transition-transform`.
- **Nav Links:** `text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant hover:text-primary transition-all`.
- **Mobile Menu:** Fullscreen animated drawer with `bg-surface`, clean sections, 4xl font headlines, and primary CTA button.

### 4.2 Form Container Card
- **Background:** `bg-surface-container-lowest` (`#ffffff`).
- **Border:** `1px solid rgba(189, 201, 202, 0.15)`.
- **Border Radius:** `rounded-[3rem]` (48px) on desktop, `rounded-3xl` on mobile.
- **Padding:** `p-8 md:p-12`.
- **Shadow:** `shadow-sm hover:shadow-xl transition-all duration-700`.

### 4.3 Form Inputs & Controls
- **Input & Select Field:**
  ```css
  bg-surface-container-low border border-outline-variant/10 rounded-2xl px-6 py-4 text-sm font-medium text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary focus:bg-surface-container-lowest transition-all
  ```
- **Textarea:**
  ```css
  bg-surface-container-low border border-outline-variant/10 rounded-[2rem] px-8 py-6 text-sm font-medium text-on-surface focus:outline-none focus:border-primary focus:bg-surface-container-lowest transition-all resize-none
  ```
- **Primary CTA Button:**
  ```css
  w-full bg-primary text-white py-5 rounded-full font-black text-xs uppercase tracking-widest hover:bg-primary-container hover:text-on-primary-container transition-all shadow-xl active:scale-95 disabled:opacity-50
  ```
- **Secondary / Ghost Button:**
  ```css
  bg-surface-container border border-outline-variant/20 text-on-surface py-4 px-6 rounded-full font-bold text-xs uppercase tracking-wider hover:bg-surface-container-high transition-all active:scale-95
  ```

### 4.4 Spacing & Containers
- **Page Container:** `max-w-screen-2xl mx-auto px-4 md:px-8 lg:px-12`.
- **Section Spacing:** `pt-32 md:pt-44 pb-20 md:pb-28`.
- **Grid Gaps:** `gap-6 md:gap-8 lg:gap-12`.

---

## 5. Developer & Testing Separation Standard

Per architectural requirements:
- The customer-facing Discovery Engine interface must be pure, clean, and reflect only Cynbit production styling.
- Developer test simulator controls (e.g. rate limit, 500 error, network dropped toggles) must be clearly segregated into a collapsible/dedicated developer toolbar that does not interfere with or impersonate production UI.

