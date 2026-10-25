import type { CommercialProfile } from "../commercial-profile/types/commercialProfile";

export interface User {
  id: string;
  username: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  bio: string;
  avatarUrl: string;
  coverUrl: string;
  location?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  state?: string;
  country?: string;
  website?: string;
  joinedAt: string;
  accountType: "personal" | "commercial";
  interests?: string[];
  onboardingCompleted?: boolean;
  commercialProfile?: CommercialProfile;
  isPrivate?: boolean;
  stats: {
    posts: number;
    followers: number;
    following: number;
    circles: number;
  };
  followingIds?: string[];
  isFollowing?: boolean;
  followRequestSent?: boolean;
  isInCircle?: boolean;
  /** Viewer-relative projection; the stored relation is account-to-target. */
  isBlocked?: boolean;
  /** Whether the active viewer blocked this profile. */
  isBlockedByViewer?: boolean;
  /** Whether this profile blocked the active viewer. */
  blocksViewer?: boolean;
  isMuted?: boolean;
  /** Identifies profile and relationship data loaded from the API, not local demo fixtures. */
  source?: "server";
}
