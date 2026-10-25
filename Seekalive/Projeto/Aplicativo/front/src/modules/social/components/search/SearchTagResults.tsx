import { motion } from "framer-motion";
import { Hash } from "lucide-react";
import { formatCount } from "@/modules/shared/utils/formatters";
import type { TrendingTopic } from "@/modules/social/data/demoTrendingTopics";

interface SearchTagResultsProps {
  tags: TrendingTopic[];
}

export function SearchTagResults({ tags }: SearchTagResultsProps) {
  if (tags.length === 0) {
    return <div className="py-16 text-center text-muted-foreground"><p className="font-medium">Nenhuma tag encontrada</p></div>;
  }

  return tags.map((topic, index) => (
    <motion.div
      key={topic.tag}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center justify-between border-b border-border px-4 py-4"
      data-testid={`result-tag-${topic.tag}`}
    >
      <div>
        <p className="text-base font-bold">{topic.tag}</p>
        <p className="text-xs text-muted-foreground">{topic.category} · {formatCount(topic.count)} publicações</p>
      </div>
      <Hash className="h-5 w-5 text-muted-foreground" />
    </motion.div>
  ));
}
