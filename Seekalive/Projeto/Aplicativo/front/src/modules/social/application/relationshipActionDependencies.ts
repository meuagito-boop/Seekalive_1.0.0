import type { Dispatch, SetStateAction } from "react";
import type { FollowRequest } from "@/modules/social/types/followRequest";
import type { User } from "@/modules/profile/types/user";
import type {
  SocialGraphAction,
  SocialGraphState,
} from "@/modules/social/state/relationshipReducer";

export type RelationshipActionDependencies = {
  state: SocialGraphState;
  currentUser: User | null;
  viewer: User | null;
  isRemoteSocialSession: boolean;
  blockedUserIdSet: Set<string>;
  accountsBlockingViewerSet: Set<string>;
  dispatch: Dispatch<SocialGraphAction>;
  updateAccount: (user: User) => void;
  remoteFollowRequests: FollowRequest[];
  setRemoteFollowRequests: Dispatch<SetStateAction<FollowRequest[]>>;
  setRemoteBlockedUserIds: Dispatch<SetStateAction<string[]>>;
  toggleBlockedUser: (userId: string) => void;
  showRefreshWarning: () => void;
  savePreviewAccount: (account: User) => void;
};

export type RelationshipActionSupport = {
  showRelationshipError: (title: string, error: unknown) => void;
  refreshRemoteAccount: (accountId: string) => Promise<User>;
};
