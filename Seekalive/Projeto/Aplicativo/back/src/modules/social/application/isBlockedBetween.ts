import type { RelationshipReadPort } from "./ports";

export function createIsBlockedBetween(port: Pick<RelationshipReadPort, "readBlockedBetween">) {
  return (firstId: string, secondId: string): Promise<boolean> =>
    port.readBlockedBetween(firstId, secondId);
}
