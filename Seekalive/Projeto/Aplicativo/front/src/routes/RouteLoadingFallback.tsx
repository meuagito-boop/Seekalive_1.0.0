export function RouteLoadingFallback() {
  return (
    <div
      className="flex min-h-[40vh] items-center justify-center bg-background px-6 text-sm text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      Carregando tela...
    </div>
  );
}
