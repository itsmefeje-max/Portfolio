## 2026-02-22 - [Interactive Contact Cards]
**Learning:** In a minimal, high-aesthetic portfolio, users often expect card-like contact methods to be interactive. Converting static "Discord" text into a "Click to Copy" button with immediate "Copied!" feedback significantly improves the perceived utility and "delight" of the contact section without requiring a full form.
**Action:** When seeing static social handles or usernames presented in cards, suggest or implement a copy-to-clipboard interaction with visual feedback.

## 2026-02-23 - [Navigation Polish]
**Learning:** In long-scrolling portfolios, providing both visual (scroll-spy) and functional (skip links, Esc-to-close) navigation improvements significantly enhances the user experience for both sighted and keyboard/screen reader users. Combining `IntersectionObserver` with semantic attributes like `aria-current` and `aria-controls` ensures these features are robust and accessible.
**Action:** Always check for skip links on secondary pages and ensure mobile menus can be closed with the Escape key. Implement scroll-spy with animated feedback to anchor the user's location in the document.
