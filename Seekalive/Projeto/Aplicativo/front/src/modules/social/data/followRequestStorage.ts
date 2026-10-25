import type { FollowRequest } from "@/modules/social/types/followRequest";

const FOLLOW_REQUESTS_KEY = "seekalive-follow-requests";

function isFollowRequest(value: unknown): value is FollowRequest {
  if (!value || typeof value !== "object") return false;
  const request = value as Partial<FollowRequest>;
  return typeof request.id === "string" &&
    typeof request.requesterId === "string" &&
    typeof request.targetId === "string" &&
    typeof request.createdAt === "string";
}

export function getStoredFollowRequests(): FollowRequest[] {
  if (typeof window === "undefined") return [];

  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(FOLLOW_REQUESTS_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter(isFollowRequest) : [];
  } catch {
    console.warn("Could not read follow requests from this browser.");
    return [];
  }
}

export function saveStoredFollowRequests(requests: FollowRequest[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(FOLLOW_REQUESTS_KEY, JSON.stringify(requests));
  } catch {
    console.warn("Could not save follow requests in this browser.");
  }
}
