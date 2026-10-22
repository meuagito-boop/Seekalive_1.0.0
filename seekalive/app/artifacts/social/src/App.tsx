import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { AppProvider, useAppContext } from "@/context/AppContext";
import { SocialProvider } from "@/context/SocialContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { AppShell } from "@/components/layout/AppShell";
import { SocialLayout } from "@/components/layout/SocialLayout";

import Splash from "@/pages/Splash";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import VerifyEmail from "@/pages/VerifyEmail";
import OnboardingInterests from "@/pages/onboarding/Interests";
import OnboardingSuggestions from "@/pages/onboarding/Suggestions";

import Feed from "@/pages/Feed";
import Seek from "@/pages/Seek";
import Shop from "@/pages/Shop";
import Search from "@/pages/Search";
import Notifications from "@/pages/Notifications";
import Messages from "@/pages/Messages";
import MessageDetail from "@/pages/MessageDetail";
import PostDetail from "@/pages/PostDetail";
import Compose from "@/pages/Compose";
import ArticleEditor from "@/pages/ArticleEditor";
import ArticleReader from "@/pages/ArticleReader";
import SeekEventDetail from "@/pages/SeekEventDetail";
import ShopItemDetail from "@/pages/ShopItemDetail";
import ActivityPage from "@/pages/ActivityPage";
import SuggestionsPage from "@/pages/SuggestionsPage";

import Profile from "@/pages/Profile";
import ProfileEdit from "@/pages/ProfileEdit";
import Followers from "@/pages/Followers";
import Following from "@/pages/Following";

import Circles from "@/pages/Circles";

import Settings from "@/pages/Settings";
import StyleGuide from "@/pages/StyleGuide";
import NotFound from "@/pages/not-found";
import SettingsAccount from "@/pages/settings/Account";
import SettingsPrivacy from "@/pages/settings/Privacy";
import SettingsBlocked from "@/pages/settings/Blocked";
import SettingsNotifications from "@/pages/settings/Notifications";
import SettingsAppearance from "@/pages/settings/Appearance";
import SettingsSecurity from "@/pages/settings/Security";

const queryClient = new QueryClient();

function UnauthRouter() {
  return (
    <Switch>
      <Route path="/" component={Splash} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="*"><Redirect to="/" /></Route>
    </Switch>
  );
}

function AuthRouter() {
  return (
    <Switch>
      {/* Full-screen routes (no layout) */}
      <Route path="/onboarding/interests" component={OnboardingInterests} />
      <Route path="/onboarding/suggestions" component={OnboardingSuggestions} />
      <Route path="/compose" component={Compose} />
      <Route path="/article/create" component={ArticleEditor} />
      <Route path="/messages/:conversationId" component={MessageDetail} />

      {/* Social module — 3-column layout */}
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

      {/* Seek module — local discovery */}
      <Route path="/seek">
        <AppShell fullWidth>
          <Seek />
        </AppShell>
      </Route>

      {/* Shop module — commerce */}
      <Route path="/shop">
        <AppShell fullWidth>
          <Shop />
        </AppShell>
      </Route>

      {/* Everything else — standard AppLayout (global header + centered content) */}
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
  );
}

function Router() {
  const { isAuthenticated } = useAppContext();
  return isAuthenticated ? <AuthRouter /> : <UnauthRouter />;
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppProvider>
          <SocialProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
          </SocialProvider>
        </AppProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
