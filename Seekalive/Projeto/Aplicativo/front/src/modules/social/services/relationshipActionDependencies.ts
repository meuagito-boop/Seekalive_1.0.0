import type { Dispatch, SetStateAction } from "react";
import type { FollowRequest } from "@/modules/social/types/followRequest";
import type { SocialAction, SocialState } from "@/modules/app/state/socialState";
import type { User } from "@/modules/profile/types/user";

export interface RelationshipActionDependencies {
  state: SocialState;
  currentUser: User | null;
  viewer: User | null;
  isRemoteSocialSession: boolean;
  blockedUserIdSet: Set<string>;
  accountsBlockingViewerSet: Set<string>;
  dispatch: Dispatch<SocialAction>;
  updateAccount: (user: User) => void;
  remoteFollowRequests: FollowRequest[];
  setRemoteFollowRequests: Dispatch<SetStateAction<FollowRequest[]>>;
  setRemoteBlockedUserIds: Dispatch<SetStateAction<string[]>>;
  toggleBlockedUser: (userId: string) => void;
  showRefreshWarning: () => void;
}
