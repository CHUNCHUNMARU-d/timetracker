---
name: Kinetic Precision
colors:
  surface: '#121414'
  surface-dim: '#121414'
  surface-bright: '#37393a'
  surface-container-lowest: '#0c0f0f'
  surface-container-low: '#1a1c1c'
  surface-container: '#1e2020'
  surface-container-high: '#282a2b'
  surface-container-highest: '#333535'
  on-surface: '#e2e2e2'
  on-surface-variant: '#c3c9b2'
  inverse-surface: '#e2e2e2'
  inverse-on-surface: '#2f3131'
  outline: '#8d937e'
  outline-variant: '#434938'
  surface-tint: '#a4d64c'
  primary: '#fefff1'
  on-primary: '#233600'
  primary-container: '#bef264'
  on-primary-container: '#4b6e00'
  inverse-primary: '#476800'
  secondary: '#b9c7e0'
  on-secondary: '#233144'
  secondary-container: '#3c4a5e'
  on-secondary-container: '#abb9d2'
  tertiary: '#fffeff'
  on-tertiary: '#283044'
  tertiary-container: '#d9e1fc'
  on-tertiary-container: '#5c637a'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#bff365'
  primary-fixed-dim: '#a4d64c'
  on-primary-fixed: '#131f00'
  on-primary-fixed-variant: '#354e00'
  secondary-fixed: '#d5e3fd'
  secondary-fixed-dim: '#b9c7e0'
  on-secondary-fixed: '#0d1c2f'
  on-secondary-fixed-variant: '#3a485c'
  tertiary-fixed: '#dae2fd'
  tertiary-fixed-dim: '#bec6e0'
  on-tertiary-fixed: '#131b2e'
  on-tertiary-fixed-variant: '#3f465c'
  background: '#121414'
  on-background: '#e2e2e2'
  surface-variant: '#333535'
typography:
  display-time:
    fontFamily: Space Grotesk
    fontSize: 64px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '800'
    lineHeight: 32px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-caps:
    fontFamily: Space Grotesk
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.1em
  data-tabular:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  touch-target-min: 48px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
  stack-sm: 4px
  stack-md: 12px
  stack-lg: 24px
---

## Brand & Style

This design system is engineered for the high-stakes environment of competitive triathlon timing. The brand personality is **rugged, technical, and high-performance**, focusing on the intersection of human endurance and data precision. 

The visual style blends **High-Contrast Bold** aesthetics with **Modern Corporate** reliability. It prioritizes rapid information processing in outdoor, high-glare environments. By utilizing deep dark backgrounds and high-visibility accents, the interface ensures that critical race data remains legible under physical stress. The design evokes a sense of professional-grade equipment—reliable, precise, and uncompromising.

## Colors

The palette is optimized for maximum contrast and energy. 

- **Primary (Neon Lime):** Reserved exclusively for primary actions, critical "Active" states, and essential timing data. It serves as a visual beacon against the dark UI.
- **Secondary (Slate Gray):** Used for structural elements, secondary buttons, and inactive states to provide depth without competing for attention.
- **Background (Midnight Blue):** The foundational layer. It provides a low-glare surface that makes neon and white elements pop, essential for outdoor visibility.
- **Text (White):** Used for primary information and high-level headings to ensure a 7:1 contrast ratio where possible.

Subtle gradients are applied to progress bars and "Live" indicators, transitioning from a darker lime to the primary #BEF264 to imply forward motion.

## Typography

The typography system relies on **Inter** for its systematic, utilitarian clarity and **Space Grotesk** for technical data points.

Key rules:
- **Numerical Data:** Always use Tabular Numerals (`tnum`) for race clocks and split times to prevent layout jitter during active countdowns.
- **Emphasis:** Use Heavy (800) weights for athlete names and rankings to ensure they are legible at a glance.
- **Readability:** Maintain generous line-heights for body text to assist reading while the user is in motion.
- **Hierarchy:** Use uppercase labels with increased letter spacing for category headers (e.g., "SWIM", "TRANSITION", "BIKE").

## Layout & Spacing

This design system employs a **Fluid Grid** model that prioritizes data density on tablet/desktop and single-column focus on mobile.

- **Hit Areas:** All interactive elements (buttons, checkboxes, list items) must maintain a minimum hit area of 48x48px to accommodate "sweaty-finger" interactions and rapid-fire input.
- **Rhythm:** A strict 8px baseline grid ensures alignment. Use `stack-lg` (24px) to separate different race segments and `stack-sm` (4px) for related data pairs (e.g., "Rank" and "Bib Number").
- **Margins:** Mobile views utilize a 16px gutter to maximize screen real estate for timing lists, while desktop layouts expand to 32px margins to create a professional, "command-center" feel.

## Elevation & Depth

Depth in the design system is achieved through **Tonal Layers** rather than traditional drop shadows, which can appear muddy on dark backgrounds.

- **Level 0 (Surface):** Deep Midnight Blue (#0F172A) for the primary application background.
- **Level 1 (Card/Container):** Slate Gray (#334155) at 40% opacity with a background blur. This creates a subtle "glass" effect that suggests high-tech sophistication.
- **Level 2 (Active/Focus):** A 1px solid stroke of Neon Lime (#BEF264) indicates the currently selected athlete or active race heat.
- **Interaction:** When pressed, elements should shift in tonal brightness rather than moving in Z-space, maintaining a "flat but layered" aesthetic.

## Shapes

The shape language is **Soft (0.25rem)**, emphasizing a "precision-tooled" look.

- **Buttons & Inputs:** Use a 4px corner radius. This provides enough softness to feel modern but remains sharp enough to look professional and rugged.
- **Status Pills:** Small indicators for "In Progress" or "Finished" should use the same 4px radius rather than full pills to maintain a consistent geometric language.
- **Large Containers:** Cards housing race statistics may use `rounded-lg` (8px) to clearly define content groupings.

## Components

- **Buttons:** Primary buttons use a solid Neon Lime fill with Black text for maximum contrast. Secondary buttons use a Slate Gray ghost-border style.
- **Race Timing Cards:** These are the hero components. They feature a large "tabular" time display, a 4px Neon Lime left-accent border to indicate "Live" status, and high-contrast white text for athlete names.
- **Progress Bars:** Segmented bars showing the three stages (Swim, Bike, Run). Completed segments turn solid Neon Lime; current segments pulse with a subtle gradient.
- **Inputs:** Dark-filled fields with 1px Slate Gray borders that turn Neon Lime on focus. Labels are always positioned above the field in `label-caps` typography.
- **Chips:** Used for "Age Group" or "Gender" categories. These are low-profile with Slate Gray backgrounds to keep the focus on the primary timing data.
- **Tactile Feedback:** Though visual, components should be designed for high-confidence tapping, using clear "Active" states that brighten the Slate Gray background to light blue-gray.