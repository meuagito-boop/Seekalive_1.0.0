import {
  currentUser,
  mockConversations,
  mockMessages,
  mockNotifications,
  mockPosts,
  mockSeekReviews,
  mockUsers,
} from "../mockData";
import { demoIntegrationPosts } from "../demoIntegrationPosts";
import { demoSeekAccounts, demoSeekReviews, withDemoSeekMedia } from "../demoSeekAccounts";
import { demoSeekEvents } from "@/modules/seek/data/demoSeekEvents";
import { demoShopItems, demoStores } from "@/modules/shop/data/demoCatalog";
import type { SocialState } from "@/modules/app/state/socialApplicationState";

export { currentUser as developmentPreviewUser };
export { demoSeekEvents as developmentSeekEvents };
export { demoShopItems as developmentShopItems, demoStores as developmentShopStores };

export const developmentExampleAccountIds = [
  ...new Set([...mockUsers, ...demoSeekAccounts].map((user) => user.id)),
];

export function createDevelopmentPreviewState(): SocialState {
  return {
    posts: [...demoIntegrationPosts, ...mockPosts].map((post) => ({
      ...post,
      isLiked: false,
      isBookmarked: false,
      isReposted: false,
    })),
    remotePosts: [],
    users: [...mockUsers.map(withDemoSeekMedia), ...demoSeekAccounts],
    notifications: [...mockNotifications],
    conversations: [...mockConversations],
    messages: [...mockMessages],
    reviews: [...mockSeekReviews, ...demoSeekReviews],
    postComments: [],
    repostEntries: [],
    followRequests: [],
  };
}
