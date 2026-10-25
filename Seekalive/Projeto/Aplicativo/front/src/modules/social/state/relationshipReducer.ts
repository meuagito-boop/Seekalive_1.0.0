import type { FollowRequest } from "@/modules/social/types/followRequest";
import type { User } from "@/modules/profile/types/user";

export interface SocialGraphState {
  users: User[];
  followRequests: FollowRequest[];
}

export type SocialGraphAction =
  | { type: "ADD_USER"; user: User }
  | { type: "UPDATE_USER"; user: User }
  | { type: "ADD_FOLLOW_REQUEST"; request: FollowRequest }
  | { type: "REMOVE_FOLLOW_REQUEST"; requestId: string };

export function socialGraphReducer(
  state: SocialGraphState,
  action: SocialGraphAction,
): SocialGraphState {
  switch (action.type) {
    case "ADD_USER":
      return {
        ...state,
        users: state.users.some((user) => user.id === action.user.id)
          ? state.users.map((user) => user.id === action.user.id ? action.user : user)
          : [...state.users, action.user],
      };
    case "UPDATE_USER":
      return {
        ...state,
        users: state.users.map((user) => user.id === action.user.id ? action.user : user),
      };
    case "ADD_FOLLOW_REQUEST":
      if (state.followRequests.some(
        (request) =>
          request.requesterId === action.request.requesterId
          && request.targetId === action.request.targetId,
      )) return state;
      return { ...state, followRequests: [...state.followRequests, action.request] };
    case "REMOVE_FOLLOW_REQUEST":
      return {
        ...state,
        followRequests: state.followRequests.filter((request) => request.id !== action.requestId),
      };
  }
}
