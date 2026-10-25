import { lazy, Suspense } from "react";
import { Redirect, Route, Switch } from "wouter";
import { RouteLoadingFallback } from "@/modules/app/components/RouteLoadingFallback";

const Splash = lazy(() => import("@/modules/app/screens/Splash"));
const Login = lazy(() => import("@/modules/auth/screens/Login"));
const Register = lazy(() => import("@/modules/auth/screens/Register"));
const ForgotPassword = lazy(() => import("@/modules/auth/screens/ForgotPassword"));
const VerifyEmail = lazy(() => import("@/modules/auth/screens/VerifyEmail"));

export default function UnauthenticatedRoutes() {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Switch>
        <Route path="/" component={Splash} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/verify-email" component={VerifyEmail} />
        <Route path="*"><Redirect to="/" /></Route>
      </Switch>
    </Suspense>
  );
}
