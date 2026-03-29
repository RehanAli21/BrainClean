# GrayGuard Color Scheme

Shared design system for mobile (React Native) and web. Dark-first, cyber-focus aesthetic.

---

## Core Palette

### Bases (The "Void")

| Token        | Hex       | Usage                                         |
|-------------|-----------|-----------------------------------------------|
| Deep Void   | `#050508` | Primary background. Almost pure black with a subtle blue tint. |
| Surface     | `#12121A` | Cards, modals, elevated containers. Dark navy. |
| Border      | `#272735` | Dividers, card borders, input borders. Subtle separator. |

### Accents (The "Energy")

| Token         | Hex       | Usage                                         |
|--------------|-----------|-----------------------------------------------|
| Electric Blue | `#2563EB` | Primary brand color. CTAs, primary buttons, active indicators, links. |
| Neon Cyan     | `#06B6D4` | Secondary accent. Active tab icons, tint, info badges. |
| Rose Alert    | `#F43F5E` | Error states, destructive actions, blocked/alert indicators. |
| Success Teal  | `#10B981` | Success states, completion indicators, positive feedback. |

### Text

| Token  | Hex       | Usage                                         |
|--------|-----------|-----------------------------------------------|
| White  | `#FFFFFF` | Primary text on dark backgrounds.             |
| Mist   | `#A1A1AA` | Secondary text, placeholders, inactive icons, captions. |

---

## Semantic Tokens (Dark Mode -- Primary)

These are the tokens components should consume. Maps palette colors to UI roles.

| Semantic Token    | Hex       | Palette Source  | Usage                                  |
|-------------------|-----------|-----------------|----------------------------------------|
| `text`            | `#FFFFFF` | White           | Primary text color.                    |
| `background`      | `#050508` | Deep Void       | Page/screen background.                |
| `surface`         | `#12121A` | Surface         | Cards, sheets, elevated elements.      |
| `border`          | `#272735` | Border          | Card borders, input borders, dividers. |
| `primary`         | `#2563EB` | Electric Blue   | Primary buttons, links, active states. |
| `tint`            | `#06B6D4` | Neon Cyan       | Tab bar active icon, accent tint.      |
| `accent`          | `#F43F5E` | Rose Alert      | Errors, destructive buttons, alerts.   |
| `icon`            | `#A1A1AA` | Mist            | Default icon color, secondary text.    |
| `tabIconDefault`  | `#A1A1AA` | Mist            | Inactive tab bar icons.                |
| `tabIconSelected` | `#06B6D4` | Neon Cyan       | Active tab bar icon.                   |

---

## Semantic Tokens (Light Mode -- Secondary)

| Semantic Token    | Hex       | Usage                                  |
|-------------------|-----------|----------------------------------------|
| `text`            | `#09090B` | Primary text.                          |
| `background`      | `#FFFFFF` | Page background.                       |
| `surface`         | `#F4F4F5` | Cards, elevated elements.              |
| `border`          | `#E4E4E7` | Borders, dividers.                     |
| `primary`         | `#2563EB` | Primary buttons, links.                |
| `tint`            | `#2563EB` | Accent tint (Electric Blue in light).  |
| `accent`          | `#F43F5E` | Errors, destructive actions.           |
| `icon`            | `#71717A` | Default icons, secondary text.         |
| `tabIconDefault`  | `#71717A` | Inactive tab bar icons.                |
| `tabIconSelected` | `#2563EB` | Active tab bar icon.                   |

---

## Opacity Modifiers

Use alpha hex suffixes on palette colors for overlays and translucent states.

| Modifier     | Suffix | Example                | Usage                                  |
|-------------|--------|------------------------|----------------------------------------|
| 10% opacity | `1A`   | `#F43F5E1A`            | Error banner backgrounds.              |
| 20% opacity | `33`   | `#2563EB33`            | Button pressed/hover overlay.          |
| 30% opacity | `4D`   | `#2563EB4D`            | Shadow glow on primary buttons.        |
| 50% opacity | `80`   | `#A1A1AA80`            | Disabled text, placeholder text.       |
| 60% opacity | `99`   | `#FFFFFF99`            | Completed/struck-through text.         |

---

## Elevation & Shadows

Shadows use the primary color for a subtle brand glow on dark backgrounds.

| Element         | Shadow Color | Offset    | Opacity | Radius | Elevation (Android) |
|----------------|-------------|-----------|---------|--------|---------------------|
| Primary Button  | `#2563EB`   | `0, 4`    | `0.3`   | `8`    | `6`                 |
| FAB             | `#2563EB`   | `0, 4`    | `0.3`   | `8`    | `6`                 |
| Card (elevated) | `#000000`   | `0, 2`    | `0.2`   | `4`    | `3`                 |

---

## Typography Scale

| Role        | Size  | Weight | Color Token | Letter Spacing |
|-------------|-------|--------|-------------|----------------|
| Page Title  | 32px  | 700    | `text`      | -              |
| Section Title | 20px | 700   | `text`      | -              |
| Card Title  | 24px  | 700    | `text`      | -              |
| Body        | 16px  | 400    | `text`      | -              |
| Body Bold   | 16px  | 600    | `text`      | -              |
| Detail      | 15px  | 400    | `icon`      | -              |
| Caption     | 13px  | 400    | `icon`      | -              |
| Label       | 12px  | 600    | `icon`      | 2px            |
| Error       | 12px  | 400    | `accent`    | -              |
| Banner Text | 14px  | 500    | `accent`    | -              |
| Button      | 16px  | 600    | `#FFFFFF`   | -              |

---

## Spacing & Sizing

| Token             | Value  | Usage                                      |
|-------------------|--------|--------------------------------------------|
| Page Padding      | 24px   | Screen container horizontal/vertical pad.  |
| Section Gap       | 24px   | Space between major sections.              |
| Card Padding      | 16px   | Internal padding for cards.                |
| Card Detail Padding | 20px | Internal padding for detail cards.         |
| Form Gap          | 16px   | Vertical space between form fields.        |
| Item Gap          | 12px   | Space between list items (cards in FlatList). |
| Inline Gap        | 10px   | Space between icon and text in rows.       |
| Small Gap         | 8px    | Minor spacing (e.g., above button).        |

---

## Component Tokens

### Buttons

| Property     | Primary Button     | Destructive (Outline) | Social Button       |
|-------------|--------------------|-----------------------|---------------------|
| Height       | 52px               | 52px                  | 52px                |
| Radius       | 12px               | 12px                  | 12px                |
| Background   | `primary` (#2563EB)| transparent           | `surface` (#12121A) |
| Border       | none               | 1px `accent`          | 1px `border`        |
| Text Color   | `#FFFFFF`          | `accent` (#F43F5E)    | `text`              |
| Text Size    | 16px / 600         | 16px / 600            | 16px / 600          |
| Active Opacity | 0.8              | 0.7                   | 0.7                 |

### Inputs

| Property      | Value                    |
|---------------|--------------------------|
| Height        | 50px                     |
| Radius        | 12px                     |
| Background    | `surface` (#12121A)      |
| Border        | 1px `border` (#272735)   |
| Text Color    | `text` (#FFFFFF)         |
| Placeholder   | `icon` (#A1A1AA)         |
| Label Size    | 12px / 600, uppercase, 2px letter-spacing |

### Cards

| Property      | Value                    |
|---------------|--------------------------|
| Radius        | 12px                     |
| Background    | `surface` (#12121A)      |
| Border        | 1px `border` (#272735)   |
| Padding       | 16px (list) / 20px (detail) |

### Tab Bar

| Property            | Value                    |
|---------------------|--------------------------|
| Background          | `background` (#050508)   |
| Border Top          | 1px `border` (#272735)   |
| Active Icon Color   | `tabIconSelected` (#06B6D4) |
| Inactive Icon Color | `tabIconDefault` (#A1A1AA)  |

### Error Banner

| Property      | Value                    |
|---------------|--------------------------|
| Background    | `accent` at 10% (#F43F5E1A) |
| Text Color    | `accent` (#F43F5E)       |
| Padding       | 12px                     |
| Radius        | 8px                      |

### FAB (Floating Action Button)

| Property      | Value                    |
|---------------|--------------------------|
| Size          | 56 x 56px                |
| Radius        | 28px (circle)            |
| Background    | `primary` (#2563EB)      |
| Icon          | 28px, `#FFFFFF`          |
| Position      | absolute, bottom: 24, right: 24 |

### Status Badge

| State      | Icon Color  | Text Color  |
|-----------|-------------|-------------|
| Completed | `#10B981`   | `#10B981`   |
| Pending   | `icon` (#A1A1AA) | `icon` (#A1A1AA) |

### Divider

| Property      | Value                    |
|---------------|--------------------------|
| Height        | 1px                      |
| Color         | `border` (#272735)       |
| Vertical Margin | 12px                   |

---

## Font Families

| Platform  | Sans                    | Serif                  | Mono                    |
|-----------|-------------------------|------------------------|-------------------------|
| iOS       | system-ui               | ui-serif               | ui-monospace            |
| Android   | normal (system default) | serif                  | monospace               |
| Web       | system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif | Georgia, 'Times New Roman', serif | SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace |

---

## CSS Custom Properties (Web)

For the web app, map semantic tokens to CSS custom properties:

```css
:root {
  /* Dark theme (default) */
  --color-text: #FFFFFF;
  --color-background: #050508;
  --color-surface: #12121A;
  --color-border: #272735;
  --color-primary: #2563EB;
  --color-tint: #06B6D4;
  --color-accent: #F43F5E;
  --color-success: #10B981;
  --color-icon: #A1A1AA;
  --color-tab-icon-default: #A1A1AA;
  --color-tab-icon-selected: #06B6D4;

  /* Spacing */
  --spacing-page: 24px;
  --spacing-section: 24px;
  --spacing-card: 16px;
  --spacing-form-gap: 16px;
  --spacing-item-gap: 12px;
  --spacing-inline: 10px;
  --spacing-sm: 8px;

  /* Radius */
  --radius-default: 12px;
  --radius-sm: 8px;
  --radius-full: 28px;

  /* Sizing */
  --button-height: 52px;
  --input-height: 50px;
  --fab-size: 56px;

  /* Shadows */
  --shadow-primary: 0 4px 8px rgba(37, 99, 235, 0.3);
  --shadow-card: 0 2px 4px rgba(0, 0, 0, 0.2);

  /* Fonts */
  --font-sans: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  --font-mono: SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
}

/* Light theme override */
[data-theme="light"] {
  --color-text: #09090B;
  --color-background: #FFFFFF;
  --color-surface: #F4F4F5;
  --color-border: #E4E4E7;
  --color-primary: #2563EB;
  --color-tint: #2563EB;
  --color-accent: #F43F5E;
  --color-success: #10B981;
  --color-icon: #71717A;
  --color-tab-icon-default: #71717A;
  --color-tab-icon-selected: #2563EB;
}
```
