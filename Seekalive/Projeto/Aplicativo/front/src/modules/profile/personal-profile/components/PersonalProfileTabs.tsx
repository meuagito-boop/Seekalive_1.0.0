import type { Dispatch, SetStateAction } from "react";
import { Link } from "wouter";
import { handleTabKeyDown } from "@/modules/shared/ui/tabKeyboard";
import { PostCard } from "@/modules/social/components/post/PostCard";
import { postPath } from "@/modules/shared/content/contentLinks";
import type { SocialComment } from "@/modules/social/types/content";
import type { Post } from "@/modules/social/types/post";
import type { User } from "@/modules/profile/types/user";
import type { ProfileTimelineEntry } from "@/modules/profile/utils/profileTimeline";
import type { getProfileMedia } from "@/modules/shared/content/postMedia";

const tabs = [
  { label: "Publicações", id: "Posts" },
  { label: "Respostas", id: "Respostas" },
  { label: "Mídias", id: "Mídias" },
  { label: "Curtidas", id: "Curtidas" },
  { label: "Artigos", id: "Artigos" },
];

interface PersonalProfileTabsProps {
  user: User;
  isMe: boolean;
  activeTab: number;
  onActiveTabChange: Dispatch<SetStateAction<number>>;
  timeline: Array<ProfileTimelineEntry<Post>>;
  userComments: SocialComment[];
  posts: Post[];
  visibleToViewer: (post: Post) => boolean;
  userMedia: ReturnType<typeof getProfileMedia>;
  likedPosts: Post[];
  userArticles: Post[];
}

export function PersonalProfileTabs({
  user,
  isMe,
  activeTab,
  onActiveTabChange,
  timeline,
  userComments,
  posts,
  visibleToViewer,
  userMedia,
  likedPosts,
  userArticles,
}: PersonalProfileTabsProps) {
  return (
    <>
      <div
        role="tablist"
        aria-label="Seções do perfil"
        className="sticky top-14 z-20 flex overflow-x-auto border-b border-border bg-background [scrollbar-width:none]"
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            id={`profile-tab-${index}`}
            aria-controls={`profile-panel-${index}`}
            type="button"
            role="tab"
            aria-selected={activeTab === index}
            tabIndex={activeTab === index ? 0 : -1}
            onKeyDown={(event) => handleTabKeyDown(event, index, tabs.length, onActiveTabChange)}
            onClick={() => onActiveTabChange(index)}
            data-testid={`tab-profile-${tab.id}`}
            className={`min-w-[96px] flex-1 shrink-0 whitespace-nowrap border-b-2 px-2 py-3 text-sm font-medium transition-colors ${
              activeTab === index
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div>
        <div id="profile-panel-0" role="tabpanel" aria-labelledby="profile-tab-0" hidden={activeTab !== 0} tabIndex={0}>
          {activeTab === 0 && (timeline.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground">
              <p className="text-sm font-medium">Nenhuma publicação ainda.</p>
            </div>
          ) : timeline.map((item) => (
            <PostCard key={item.key} post={item.post} repostedById={item.repostedById} />
          )))}
        </div>
        <div id="profile-panel-1" role="tabpanel" aria-labelledby="profile-tab-1" hidden={activeTab !== 1} tabIndex={0}>
          {activeTab === 1 && (userComments.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground">
              <p className="text-sm">Nenhuma resposta ainda.</p>
            </div>
          ) : userComments.map((comment) => {
            const target = posts.find((post) => post.id === comment.postId);
            return (
              <div key={comment.id} className="border-b border-border px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  {comment.replyToCommentId ? "Respondeu a um comentário em " : "Comentou em "}
                  {target && visibleToViewer(target)
                    ? <Link href={postPath(target)} className="font-semibold text-primary hover:underline">{target.article?.title ?? (target.content.slice(0, 60) || "publicação")}</Link>
                    : <span>publicação indisponível</span>}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{comment.content}</p>
              </div>
            );
          }))}
        </div>
        <div id="profile-panel-2" role="tabpanel" aria-labelledby="profile-tab-2" hidden={activeTab !== 2} tabIndex={0}>
          {activeTab === 2 && (userMedia.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground">
              <p className="text-sm font-medium">Nenhuma mídia nesta conta ainda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1 p-1 sm:grid-cols-3">
              {userMedia.map((media) => (
                <div key={media.id} className="aspect-square overflow-hidden rounded-lg bg-muted">
                  {media.type === "video" ? (
                    <video src={media.url} controls playsInline className="h-full w-full object-cover" />
                  ) : (
                    <img src={media.url} alt={`Mídia de ${user.displayName}`} className="h-full w-full object-cover" />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div id="profile-panel-3" role="tabpanel" aria-labelledby="profile-tab-3" hidden={activeTab !== 3} tabIndex={0}>
          {activeTab === 3 && (!isMe ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground">
              <p className="text-sm">As curtidas de @{user.username} são privadas.</p>
            </div>
          ) : likedPosts.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground">
              <p className="text-sm">Você ainda não curtiu publicações.</p>
            </div>
          ) : likedPosts.map((post) => <PostCard key={post.id} post={post} />))}
        </div>
        <div id="profile-panel-4" role="tabpanel" aria-labelledby="profile-tab-4" hidden={activeTab !== 4} tabIndex={0}>
          {activeTab === 4 && (userArticles.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
              <p className="text-sm">Nenhum artigo ainda.</p>
              {isMe && <Link href="/article/create" className="text-sm font-semibold text-primary hover:underline">Escrever artigo</Link>}
            </div>
          ) : userArticles.map((post) => <PostCard key={post.id} post={post} />))}
        </div>
      </div>
    </>
  );
}
