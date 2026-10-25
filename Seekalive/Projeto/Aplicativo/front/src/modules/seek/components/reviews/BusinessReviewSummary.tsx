import { Star } from "lucide-react";

interface BusinessReviewSummaryProps {
  averageRating: number;
  count: number;
}

export function BusinessReviewSummary({ averageRating, count }: BusinessReviewSummaryProps) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-muted/50 px-4 py-3">
      <Star aria-hidden="true" className="h-5 w-5 fill-yellow-400 text-yellow-400" />
      <span className="text-lg font-bold">
        {count
          ? averageRating.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
          : "—"}
      </span>
      <span className="text-sm text-muted-foreground">
        {count} {count === 1 ? "avaliação" : "avaliações"}
      </span>
    </div>
  );
}
