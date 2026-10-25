import { lazy, Suspense } from "react";
import { Redirect, Route, Switch, useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { AppShell } from "@/components/layout/AppShell";
import { SocialLayout } from "@/components/layout/SocialLayout";
import { SocialProvider } from "@/context/SocialContext";
import { useAppContext } from "@/context/AppContext";
import { RouteLoadingFallback } from "@/routes/RouteLoadingFallback";

const OnboardingInterests = lazy(() => import("@/pages/onboarding/Interests"));
const OnboardingSuggestions = lazy(() => import("@/pages/onboarding/Suggestions"));
const Feed = lazy(() => import("@/pages/Feed"));
const Seek = lazy(() => import("@/pages/Seek"));
const Shop = lazy(() => import("@/pages/Shop"));
const Search = lazy(() => import("@/pages/Search"));
const Notifications = lazy(() => import("@/pages/Notifications"));
const Messages = lazy(() => import("@/pages/Messages"));
const MessageDetail = lazy(() => import("@/pages/MessageDetail"));
const PostDetail = lazy(() => import("@/pages/PostDetail"));
const Compose = lazy(() => import("@/pages/Compose"));
const ArticleEditor = lazy(() => import("@/pages/ArticleEditor"));
const ArticleReader = lazy(() => import("@/pages/ArticleReader"));
const SeekEventDetail = lazy(() => import("@/pages/SeekEventDetail"));
const ShopItemDetail = lazy(() => import("@/pages/ShopItemDetail"));
const ActivityPage = lazy(() => import("@/pages/ActivityPage"));
const SuggestionsPage = lazy(() => import("@/pages/SuggestionsPage"));
const Profile = lazy(() => import("@/pages/Profile"));
const ProfileEdit = lazy(() => import("@/pages/ProfileEdit"));
const Followers = lazy(() => import("@/pages/Followers"));
const Following = lazy(() => import("@/pages/Following"));
const Circles = lazy(() => import("@/pages/Circles"));
const Settings = lazy(() => import("@/pages/Settings"));
const StyleGuide = lazy(() => import("@/pages/StyleGuide"));
const NotFound = lazy(() => import("@/pages/not-found"));
const SettingsAccount = lazy(() => import("@/pages/settings/Account"));
const SettingsPrivacy = lazy(() => import("@/pages/settings/Privacy"));
const SettingsBlocked = lazy(() => import("@/pages/settings/Blocked"));
const SettingsNotifications = lazy(() => import("@/pages/settings/Notifications"));
const SettingsAppearance = lazy(() => import("@/pages/settings/Appearance"));
const SettingsSecurity = lazy(() => import("@/pages/settings/Security"));

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
