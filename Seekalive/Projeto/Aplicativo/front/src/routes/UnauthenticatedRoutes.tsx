import { lazy, Suspense } from "react";
import { Redirect, Route, Switch } from "wouter";
import { RouteLoadingFallback } from "@/routes/RouteLoadingFallback";

const Splash = lazy(() => import("@/pages/Splash"));
const Login = lazy(() => import("@/pages/Login"));
const Register = lazy(() => import("@/pages/Register"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const VerifyEmail = lazy(() => import("@/pages/VerifyEmail"));

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
