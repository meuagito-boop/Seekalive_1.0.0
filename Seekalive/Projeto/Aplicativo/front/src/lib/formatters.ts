export function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const timestamp = new Date(dateStr).getTime();
  if (!Number.isFinite(timestamp)) return "Data indisponível";
  const diff = Math.max(0, now - timestamp);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  if (hours < 24) return `há ${hours} h`;
  if (days < 7) return `há ${days} d`;
  return new Date(timestamp).toLocaleDateString("pt-BR", { month: "short", day: "numeric" });
}

export function formatCount(n: number): string {
  return new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 })
    .format(Number.isFinite(n) ? Math.max(0, n) : 0);
}
