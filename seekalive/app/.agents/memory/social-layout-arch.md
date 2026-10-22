---
name: Social module layout architecture
description: How the Social/Feed page uses its own dedicated layout instead of AppLayout
---

The /feed route is extracted from the AppLayout wrapper in AuthRouter and wrapped with SocialLayout instead.

**Why:** The social module needs a 3-column desktop layout (sidebar + feed + context panel) and a new desktop header with center module navigation — neither of which is compatible with the existing AppLayout that uses a sidebar (left) + 600px-max single column.

**How to apply:** In App.tsx AuthRouter, /feed must come BEFORE the catch-all AppLayout Route. SocialLayout provides: SocialDesktopHeader (hidden md:flex, sticky), mobile Header (md:hidden), central search bar (desktop), 3-column grid (desktop), mobile search row with drawer toggle, BottomNav, and SocialDrawer.

Social sub-pages (/social/activity, /social/suggestions) still use AppLayout — only the /feed main page uses SocialLayout.

**Key offset values:** SocialDesktopHeader = h-14 (56px), search bar = ~48px → tabs inside Feed sticky at `top-14 md:top-[104px]`. Sidebar and right panel sticky at `top-[104px]` (sticky top of their flex container).
