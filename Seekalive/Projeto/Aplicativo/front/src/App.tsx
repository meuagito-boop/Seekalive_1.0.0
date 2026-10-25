import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Redirect, Router as WouterRouter, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider, useAppContext } from "@/context/AppContext";
import { RouteLoadingFallback } from "@/modules/app/components/RouteLoadingFallback";

const UnauthenticatedRoutes = lazy(() => import("@/modules/app/routes/UnauthenticatedRoutes"));
const AuthenticatedRoutes = lazy(() => import("@/modules/app/routes/AuthenticatedRoutes"));
const queryClient = new QueryClient();

function Router() {
  const {
    currentUser,
    isAuthenticated,
    isAuthLoading,
    sessionCheckUnavailable,
    retrySessionCheck,
  } = useAppContext();
  const [location] = useLocation();

  if (isAuthLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background px-6 text-sm text-muted-foreground" role="status">
        Verificando sua sessão...
      </div>
    );
  }
  if (sessionCheckUnavailable) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-background px-6 text-center">
        <section className="max-w-md" role="alert">
          <h1 className="text-lg font-semibold text-foreground">Não foi possível verificar sua sessão</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Não vamos tratar uma falha de conexão como se você tivesse saído da conta.
          </p>
          <button
            type="button"
            className="mt-5 min-h-11 rounded-xl bg-primary px-5 font-semibold text-primary-foreground"
            onClick={retrySessionCheck}
          >
            Tentar novamente
          </button>
        </section>
      </main>
    );
  }
  if (isAuthenticated && currentUser?.onboardingCompleted === false && location !== "/onboarding/interests") {
    return <Redirect to="/onboarding/interests" />;
  }
  if (isAuthenticated && currentUser?.onboardingCompleted && location === "/onboarding/interests") {
    return <Redirect to="/feed" />;
  }

  const Routes = isAuthenticated ? AuthenticatedRoutes : UnauthenticatedRoutes;
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes />
    </Suspense>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </AppProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
