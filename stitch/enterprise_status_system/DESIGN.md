---
name: Enterprise Status System
colors:
  surface: '#151218'
  surface-dim: '#151218'
  surface-bright: '#3b383f'
  surface-container-lowest: '#100d13'
  surface-container-low: '#1d1a21'
  surface-container: '#211e25'
  surface-container-high: '#2c292f'
  surface-container-highest: '#37333a'
  on-surface: '#e7e0e9'
  on-surface-variant: '#ccc3d3'
  inverse-surface: '#e7e0e9'
  inverse-on-surface: '#332f36'
  outline: '#968e9c'
  outline-variant: '#4a4451'
  surface-tint: '#d6baff'
  primary: '#d6baff'
  on-primary: '#41127b'
  primary-container: '#bf95ff'
  on-primary-container: '#4f258a'
  inverse-primary: '#7149ad'
  secondary: '#bdc4ee'
  on-secondary: '#272e50'
  secondary-container: '#40476a'
  on-secondary-container: '#afb6df'
  tertiary: '#cfcc41'
  on-tertiary: '#333200'
  tertiary-container: '#b1ae23'
  on-tertiary-container: '#414000'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ecdcff'
  primary-fixed-dim: '#d6baff'
  on-primary-fixed: '#280056'
  on-primary-fixed-variant: '#582f93'
  secondary-fixed: '#dde1ff'
  secondary-fixed-dim: '#bdc4ee'
  on-secondary-fixed: '#111939'
  on-secondary-fixed-variant: '#3d4567'
  tertiary-fixed: '#ece85b'
  tertiary-fixed-dim: '#cfcc41'
  on-tertiary-fixed: '#1d1d00'
  on-tertiary-fixed-variant: '#4a4900'
  background: '#151218'
  on-background: '#e7e0e9'
  surface-variant: '#37333a'
typography:
  headline-lg:
    fontFamily: IBM Plex Sans
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
  headline-md:
    fontFamily: IBM Plex Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: IBM Plex Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: IBM Plex Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
  max-width: 1440px
---

## Brand & Style

The design system is engineered for mission-critical monitoring and enterprise infrastructure transparency. It prioritizes clarity, authority, and reliability, evoking a sense of calm under pressure. The aesthetic is **Corporate / Modern** with a high-density information architecture.

The visual language balances the deep, trustworthy authority of dark navy surfaces with a precise grayscale scale for status modules and data grids. It avoids unnecessary ornamentation, focusing instead on structural alignment and clear visual hierarchies to ensure that critical system updates are immediately legible.

## Colors

The palette is optimized for a dark-first enterprise environment. The primary surface is defined by a deep obsidian navy (`#000526`), providing a high-contrast foundation for status indicators. 

- **Primary Accent:** A vibrant lavender (`#bf95ff`) is used sparingly for interactive highlights, primary actions, and focus states.
- **Surface Scale:** A systematic grayscale (`#666666` through `#cccccc`) is utilized for container borders, secondary text, and inactive states. 
- **Functional Semantics:** While the core palette is neutral and cool-toned, standard status colors (green for healthy, amber for warning, red for critical) should be applied using the same saturation levels as the primary accent to maintain visual harmony.

## Typography

This design system employs a systematic, engineering-focused typographic approach. **IBM Plex Sans** provides a neutral yet technical character for all interface elements, ensuring readability at small scales in dense data tables.

For technical metadata, timestamps, and system IDs, **JetBrains Mono** is utilized to provide a clear distinction between narrative content and machine data. Typography should remain consistently high-contrast against the dark backgrounds, primarily using the `#cccccc` and white tokens.

## Layout & Spacing

The layout follows a **Fixed Grid** philosophy on desktop to ensure dashboards remain predictable and scannable. A 12-column grid is used with a maximum width of 1440px.

Spacing is based on a strict 4px baseline grid to maintain alignment in complex layouts.
- **Desktop:** 32px margins with 16px gutters between cards.
- **Tablet:** 24px margins; columns collapse into a 6-column grid for monitoring feeds.
- **Mobile:** 16px margins; all cards stack vertically to 100% width.

Padding within components (like status cards) should be generous (20px or 24px) to offset the density of the information.

## Elevation & Depth

In this dark-mode centric design system, depth is achieved through **Tonal Layers** rather than shadows. 

- **Level 0 (Background):** The primary `#000526` surface.
- **Level 1 (Cards/Modules):** Surfaces using a slightly lighter tint or subtle 1px borders using `#666666`.
- **Level 2 (Modals/Popovers):** Higher contrast borders using `#808080` with a very subtle backdrop blur to provide separation from the primary monitoring layer.

Shadows, if used, must be tight and dark, serving only to lift interactive elements like buttons slightly off the surface.

## Shapes

The shape language is conservative and professional. A **Soft** roundedness level is applied to maintain a modern feel without appearing overly consumer-oriented.

- **Standard Elements:** 0.25rem (4px) corner radius for buttons and input fields.
- **Containers:** 0.5rem (8px) corner radius for dashboard cards and status modules.
- **Status Pills:** Fully rounded (pill-shaped) to distinguish them from structural blocks.

## Components

### Buttons
Primary buttons use the `#bf95ff` background with black text for maximum prominence. Secondary buttons use a transparent background with a 1px border of `#999999`.

### Input Fields
Inputs are dark-themed with a `#000526` fill and a `#666666` border. On focus, the border transitions to `#bf95ff`. Labels use the Mono font for a technical aesthetic.

### Status Chips
Status chips are the most critical component. They use high-saturation background tints with white text. For example, "Operational" uses a dark green base, while "Service Interruption" uses a bold red.

### Lists & Data Grids
Rows are separated by subtle `#666666` horizontal rules. Hover states on list items should use a subtle highlight of `#808080` at 10% opacity.

### Cards
Cards are the primary container for status modules. They feature a 1px border of `#666666` and no shadow, relying on the tonal contrast against the `#000526` background.