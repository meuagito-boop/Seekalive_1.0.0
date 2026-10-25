import { lazy, Suspense } from "react";
import { Redirect, Route, Switch, useLocation } from "wouter";
import { AppLayout } from "@/modules/app/layouts/AppLayout";
import { AppShell } from "@/modules/app/layouts/AppShell";
import { SocialLayout } from "@/modules/social/components/layout/SocialLayout";
import { SocialProvider } from "@/modules/app/state/SocialContext";
import { useAppContext } from "@/modules/app/state/AppContext";
import { RouteLoadingFallback } from "@/modules/app/components/RouteLoadingFallback";

const OnboardingInterests = lazy(() => import("@/modules/onboarding/screens/Interests"));
const OnboardingSuggestions = lazy(() => import("@/modules/onboarding/screens/Suggestions"));
const Feed = lazy(() => import("@/modules/social/screens/Feed"));
const Seek = lazy(() => import("@/modules/seek/screens/Seek"));
const Shop = lazy(() => import("@/modules/shop/screens/Shop"));
const Search = lazy(() => import("@/modules/social/screens/Search"));
const Notifications = lazy(() => import("@/modules/notifications/screens/Notifications"));
const Messages = lazy(() => import("@/modules/messages/screens/Messages"));
const MessageDetail = lazy(() => import("@/modules/messages/screens/MessageDetail"));
const PostDetail = lazy(() => import("@/modules/social/screens/PostDetail"));
const Compose = lazy(() => import("@/modules/social/screens/Compose"));
const ArticleEditor = lazy(() => import("@/modules/social/screens/ArticleEditor"));
const ArticleReader = lazy(() => import("@/modules/social/screens/ArticleReader"));
const SeekEventDetail = lazy(() => import("@/modules/seek/screens/SeekEventDetail"));
const ShopItemDetail = lazy(() => import("@/modules/shop/screens/ShopItemDetail"));
const ActivityPage = lazy(() => import("@/modules/social/screens/ActivityPage"));
const SuggestionsPage = lazy(() => import("@/modules/social/screens/SuggestionsPage"));
const Profile = lazy(() => import("@/modules/profile/screens/Profile"));
const ProfileEdit = lazy(() => import("@/modules/profile/screens/ProfileEdit"));
const Followers = lazy(() => import("@/modules/social/screens/Followers"));
const Following = lazy(() => import("@/modules/social/screens/Following"));
const Circles = lazy(() => import("@/modules/social/screens/Circles"));
const Settings = lazy(() => import("@/modules/settings/screens/Settings"));
const StyleGuide = lazy(() => import("@/modules/app/screens/StyleGuide"));
const NotFound = lazy(() => import("@/modules/app/screens/NotFound"));
const SettingsAccount = lazy(() => import("@/modules/settings/screens/Account"));
const SettingsPrivacy = lazy(() => import("@/modules/settings/screens/Privacy"));
const SettingsBlocked = lazy(() => import("@/modules/settings/screens/Blocked"));
const SettingsNotifications = lazy(() => import("@/modules/settings/screens/Notifications"));
const SettingsAppearance = lazy(() => import("@/modules/settings/screens/Appearance"));
const SettingsSecurity = lazy(() => import("@/modules/settings/screens/Security"));

function AuthenticatedPageRoutes() {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Switch>
        <Route path="/onboarding/interests" component={OnboardingInterests} />
        <Route path="/onboarding/suggestions" component={OnboardingSuggestions} />
        <Route path="/compose" component={Compose} />
        <Route path="/article/create" component={ArticleEditor} />
        <Route path="/messages/:conversationId" component={MessageDetail} />

        <Route path="/feed">
          <SocialLayout>
            <Feed />
          </SocialLayout>
        </Route>

        <Route path="/seek/event/:id">
          <AppShell fullWidth>
            <SeekEventDetail />
          </AppShell>
        </Route>
        <Route path="/shop/item/:id">
          <AppShell fullWidth>
            <ShopItemDetail />
          </AppShell>
        </Route>
        <Route path="/seek">
          <AppShell fullWidth>
            <Seek />
          </AppShell>
        </Route>
        <Route path="/shop">
          <AppShell fullWidth>
            <Shop />
          </AppShell>
        </Route>

        <Route>
          <AppLayout>
            <Switch>
              <Route path="/search" component={Search} />
              <Route path="/notifications" component={Notifications} />
              <Route path="/messages" component={Messages} />
              <Route path="/post/:postId" component={PostDetail} />
              <Route path="/article/:postId" component={ArticleReader} />
              <Route path="/profile/edit" component={ProfileEdit} />
              <Route path="/profile/:username/followers" component={Followers} />
              <Route path="/profile/:username/following" component={Following} />
              <Route path="/profile/:username/circles" component={Circles} />
              <Route path="/profile/:username" component={Profile} />
              <Route path="/profile" component={Profile} />
              <Route path="/circles" component={Circles} />
              <Route path="/social/activity" component={ActivityPage} />
              <Route path="/social/suggestions" component={SuggestionsPage} />
              <Route path="/settings/account" component={SettingsAccount} />
              <Route path="/settings/privacy" component={SettingsPrivacy} />
              <Route path="/settings/blocked" component={SettingsBlocked} />
              <Route path="/settings/notifications" component={SettingsNotifications} />
              <Route path="/settings/appearance" component={SettingsAppearance} />
              <Route path="/settings/security" component={SettingsSecurity} />
              <Route path="/settings" component={Settings} />
              <Route path="/styleguide" component={StyleGuide} />
              <Route path="/"><Redirect to="/feed" /></Route>
              <Route path="*" component={NotFound} />
            </Switch>
          </AppLayout>
        </Route>
      </Switch>
    </Suspense>
  );
}

export default function AuthenticatedRoutes() {
  const {
    logoutError,
    clearLogoutError,
    isDevelopmentPreview,
    logout,
  } = useAppContext();
  const [, setLocation] = useLocation();

  return (
    <SocialProvider>
      <>
        {logoutError && (
          <div role="alert" className="relative z-[110] flex items-center justify-center gap-3 border-b border-destructive/30 bg-background px-4 py-2 text-center text-sm text-destructive">
            <span>{logoutError}</span>
            <button type="button" className="font-semibold underline" onClick={clearLogoutError}>
              Fechar
            </button>
          </div>
        )}
        {import.meta.env.DEV && isDevelopmentPreview && (
          <div
            role="status"
            className="relative z-[100] flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-primary/30 bg-background px-3 py-2 text-center text-xs text-muted-foreground"
          >
            <span>Demonstração de desenvolvimento — dados fictícios, sem conta ou sessão real.</span>
            <button
              type="button"
              className="font-semibold text-primary hover:underline"
              onClick={() => { void logout().then((didLogout) => { if (didLogout) setLocation("/login"); }); }}
            >
              Encerrar demonstração
            </button>
          </div>
        )}
        <AuthenticatedPageRoutes />
      </>
    </SocialProvider>
  );
}
