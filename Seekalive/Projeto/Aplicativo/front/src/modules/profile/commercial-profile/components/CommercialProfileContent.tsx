import { PostCard } from "@/modules/social/components/post/PostCard";
import type { Post } from "@/modules/social/types/post";
import type { User } from "@/modules/profile/types/user";
import type { ProfileTimelineEntry } from "@/modules/profile/utils/profileTimeline";

type CommercialProfileContentProps = {
  articles: Post[];
  profile: User;
  tab: "Publicações" | "Artigos";
  timeline: ProfileTimelineEntry<Post>[];
};

export function CommercialProfileContent({
  articles,
  profile,
  tab,
  timeline,
}: CommercialProfileContentProps) {
  const isArticles = tab === "Artigos";

  return (
    <section className="mx-auto max-w-2xl">
      <h2 className="mb-4 text-xl font-bold">
        {isArticles ? "Artigos" : "Publicações"} de {profile.displayName}
      </h2>
      {isArticles ? (
        articles.length ? (
          articles.map((post) => <PostCard key={post.id} post={post} />)
        ) : (
          <EmptyProfileContent tab={tab} />
        )
      ) : timeline.length ? (
        timeline.map((item) => (
          <PostCard
            key={item.key}
            post={item.post}
            repostedById={item.repostedById}
          />
        ))
      ) : (
        <EmptyProfileContent tab={tab} />
      )}
    </section>
  );
}

function EmptyProfileContent({
  tab,
}: {
  tab: CommercialProfileContentProps["tab"];
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border px-5 py-12 text-center text-sm text-muted-foreground">
      {tab === "Artigos"
        ? "Nenhum artigo publicado por este perfil. Artigos de outras pessoas sobre este lugar aparecem nos perfis delas."
        : "Este perfil comercial ainda não publicou nada no Social."}
    </div>
  );
}
