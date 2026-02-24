## 2026-02-22 - [Interactive Contact Cards]
**Learning:** In a minimal, high-aesthetic portfolio, users often expect card-like contact methods to be interactive. Converting static "Discord" text into a "Click to Copy" button with immediate "Copied!" feedback significantly improves the perceived utility and "delight" of the contact section without requiring a full form.
**Action:** When seeing static social handles or usernames presented in cards, suggest or implement a copy-to-clipboard interaction with visual feedback.

## 2026-02-24 - [Keyboard-Accessible Galleries & Menus]
**Learning:** Static site portfolios often rely on hover effects for dropdowns and click events for galleries, leaving keyboard users stranded. Adding `aria-expanded` syncing on focus, visual chevrons for dropdown triggers, and `Enter/Space` listeners for gallery items (`tabindex="0"`) provides a complete accessibility "bridge" that feels native to the UI.
**Action:** Always check if hover-triggered content (menus) and custom image grids (galleries) are keyboard-focusable and provide appropriate ARIA state feedback.
