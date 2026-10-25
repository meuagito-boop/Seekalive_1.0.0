import { PostCard } from "@/modules/social/components/post/PostCard";
import type { Post } from "@/modules/social/types/post";

interface SearchPostResultsProps {
  posts: Post[];
  query: string;
}

export function SearchPostResults({ posts, query }: SearchPostResultsProps) {
  return posts.length === 0 ? (
    <div className="py-16 text-center text-muted-foreground">
      <p className="font-medium">Nenhuma publicação encontrada para &quot;{query}&quot;</p>
    </div>
  ) : (
    posts.map((post) => <PostCard key={post.id} post={post} />)
  );
}
