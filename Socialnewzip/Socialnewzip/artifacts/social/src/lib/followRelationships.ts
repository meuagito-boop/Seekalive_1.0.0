import type { User } from "@/data/mockData";

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
