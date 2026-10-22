---
name: Orbit Social Network
description: Key architecture decisions for the Orbit social network frontend in artifacts/social
---

# Orbit Social Network

**Why:** Frontend-only microblogging app (X + Threads + TikTok style). Dark mode only.

## Stack
- React + Vite, Wouter routing, Framer Motion, react-hook-form + zod, TanStack Query, shadcn/ui
- All mock data in `artifacts/social/src/data/mockData.ts`
- Context in `artifacts/social/src/context/AppContext.tsx`

## Theme
- CSS vars space-separated HSL: `--background: 230 25% 6%`, `--primary: 250 85% 65%`
- Dark forced via `document.documentElement.classList.add("dark")` in App.tsx useEffect
- App is ALWAYS dark — no light mode toggle

## Key conventions
- Auth flow: unauthenticated → Splash/Login/Register; after login → /feed; after register → /onboarding/interests → /onboarding/suggestions → /feed
- "Circles" = mutual friendship system (both must accept, like Facebook friends but named Circles)
- Navigation: bottom nav (mobile), sidebar (desktop md+), max-w-[600px] center column
- Onboarding pages and Compose/MessageDetail render WITHOUT AppLayout (full-screen, no nav)

## Pages built (all 28 screens)
Auth: Splash, Login, Register, ForgotPassword, VerifyEmail, onboarding/Interests, onboarding/Suggestions
Main: Feed (3 tabs: ForYou/Following/Videos), Search, Notifications, Messages, MessageDetail, PostDetail, Compose
Profile: Profile, ProfileEdit, Followers, Following, Circles
Communities: Communities, CommunityCreate, CommunityDetail, CommunitySettings
Settings: Settings hub, Account, Privacy, Blocked, Notifications, Appearance, Security

## Backend docs
Full API spec in `ORBIT_SOCIAL_NETWORK_DOCS.md` at project root.

**How to apply:** When adding new screens, follow the pattern — pages inside AppLayout get nav, fullscreen pages (auth, compose, messages detail) render outside AppLayout.
