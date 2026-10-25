import { PostCard } from "@/modules/social/components/post/PostCard";
import type { Post } from "@/modules/social/types/post";

interface CommercialPostsTabProps {
  displayName: string;
  timeline: Array<{ key: string; post: Post; repostedById: string | undefined }>;
}

export function CommercialPostsTab({ displayName, timeline }: CommercialPostsTabProps) {
  return (
    <section className="mx-auto max-w-2xl">
      <h2 className="mb-4 text-xl font-bold">Publicações de {displayName}</h2>
      {timeline.length ? timeline.map((item) => (
        <PostCard key={item.key} post={item.post} repostedById={item.repostedById} />
      )) : (
        <div className="rounded-2xl border border-dashed border-border px-5 py-12 text-center text-sm text-muted-foreground">
          Este perfil comercial ainda não publicou nada no Social.
        </div>
      )}
    </section>
  );
}
