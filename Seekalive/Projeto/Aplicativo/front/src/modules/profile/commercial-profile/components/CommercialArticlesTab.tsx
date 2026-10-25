import { PostCard } from "@/modules/social/components/post/PostCard";
import type { Post } from "@/modules/social/types/post";

interface CommercialArticlesTabProps {
  displayName: string;
  articles: Post[];
}

export function CommercialArticlesTab({ displayName, articles }: CommercialArticlesTabProps) {
  return (
    <section className="mx-auto max-w-2xl">
      <h2 className="mb-4 text-xl font-bold">Artigos de {displayName}</h2>
      {articles.length ? articles.map((post) => <PostCard key={post.id} post={post} />) : (
        <div className="rounded-2xl border border-dashed border-border px-5 py-12 text-center text-sm text-muted-foreground">
          Nenhum artigo publicado por este perfil. Artigos de outras pessoas sobre este lugar aparecem nos perfis delas.
        </div>
      )}
    </section>
  );
}
