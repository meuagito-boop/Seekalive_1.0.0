export type RelationshipView = {
  following: "none" | "pending" | "accepted";
  inCircle: boolean;
  blockedByMe: boolean;
  blockedByThem: boolean;
  mutedByMe: boolean;
};

export type RelationshipState = {
  acceptedFollow: boolean;
  pendingRequest: boolean;
  reciprocalFollow: boolean;
  blockedByMe: boolean;
  blockedByThem: boolean;
};

export function buildRelationshipView(state: RelationshipState): RelationshipView {
  const following = state.acceptedFollow
    ? "accepted"
    : state.pendingRequest
      ? "pending"
      : "none";

  return {
    following,
    inCircle: following === "accepted" && state.reciprocalFollow,
    blockedByMe: state.blockedByMe,
    blockedByThem: state.blockedByThem,
    mutedByMe: false,
  };
}
