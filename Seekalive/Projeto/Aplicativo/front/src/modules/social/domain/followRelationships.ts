import type { FollowRequest } from "@/modules/social/types/followRequest";
import type { User } from "@/modules/profile/types/user";

export function viewerFollowsUser(viewer: User | undefined, target: User | undefined): boolean {
  if (!viewer || !target) return false;
  if (viewer.followingIds) return viewer.followingIds.includes(target.id);

  // The demo profile stores the viewer-relative follow state on the target.
  return viewer.id === "me" && target.isFollowing === true;
}

export function areMutualFollowers(viewer: User | undefined, target: User | undefined): boolean {
  return !!viewer && !!target &&
    viewerFollowsUser(viewer, target) &&
    (target.followingIds ?? []).includes(viewer.id);
}

export function removeFollowEdgesForBlock(actor: User, target: User) {
  const actorFollowsTarget = viewerFollowsUser(actor, target);
  const targetFollowsActor = viewerFollowsUser(target, actor);
  const mutual = actorFollowsTarget && targetFollowsActor;

  return {
    actor: {
      ...actor,
      followingIds: (actor.followingIds ?? []).filter(id => id !== target.id),
      stats: {
        ...actor.stats,
        following: Math.max(0, actor.stats.following - Number(actorFollowsTarget)),
        followers: Math.max(0, actor.stats.followers - Number(targetFollowsActor)),
        circles: Math.max(0, actor.stats.circles - Number(mutual)),
      },
    },
    target: {
      ...target,
      isFollowing: false,
      followingIds: (target.followingIds ?? []).filter(id => id !== actor.id),
      stats: {
        ...target.stats,
        following: Math.max(0, target.stats.following - Number(targetFollowsActor)),
        followers: Math.max(0, target.stats.followers - Number(actorFollowsTarget)),
        circles: Math.max(0, target.stats.circles - Number(mutual)),
      },
    },
    changed: actorFollowsTarget || targetFollowsActor,
  };
}

export function followRequestIdsBetween(
  requests: FollowRequest[],
  firstAccountId: string,
  secondAccountId: string,
): string[] {
  return requests
    .filter(request =>
      (request.requesterId === firstAccountId && request.targetId === secondAccountId)
      || (request.requesterId === secondAccountId && request.targetId === firstAccountId)
    )
    .map(request => request.id);
}
