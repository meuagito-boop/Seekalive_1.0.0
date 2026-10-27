export type FollowTransitionInput = {
  actorIsEligible: boolean;
  targetIsEligible: boolean;
  blocked: boolean;
  targetIsPrivate: boolean;
  existingFollowAt: string | null;
  existingRequestAt: string | null;
};

export type FollowTransition =
  | { kind: "unavailable" }
  | { kind: "already_following"; updatedAt: string }
  | { kind: "request_pending"; updatedAt: string }
  | { kind: "create_request" }
  | { kind: "create_follow" };

export function canStartFollow(input: {
  actorIsEligible: boolean;
  targetIsEligible: boolean;
  blocked: boolean;
}): boolean {
  return input.actorIsEligible && input.targetIsEligible && !input.blocked;
}

export function decideFollowTransition(input: FollowTransitionInput): FollowTransition {
  if (!canStartFollow(input)) {
    return { kind: "unavailable" };
  }
  if (input.existingFollowAt) {
    return { kind: "already_following", updatedAt: input.existingFollowAt };
  }
  if (input.targetIsPrivate) {
    return input.existingRequestAt
      ? { kind: "request_pending", updatedAt: input.existingRequestAt }
      : { kind: "create_request" };
  }
  return { kind: "create_follow" };
}

export function canAcceptFollowRequest(input: {
  targetIsEligible: boolean;
  requesterIsEligible: boolean;
  blocked: boolean;
  requestExists: boolean;
}): boolean {
  return input.targetIsEligible
    && input.requesterIsEligible
    && !input.blocked
    && input.requestExists;
}

export function canCreateBlock(input: {
  actorIsEligible: boolean;
  targetIsEligible: boolean;
}): boolean {
  return input.actorIsEligible && input.targetIsEligible;
}
