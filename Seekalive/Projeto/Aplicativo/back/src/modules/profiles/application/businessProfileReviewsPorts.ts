export type AccountViewReader = (
  account: {
    id: string;
    username: string;
    accountType: string;
    createdAt: Date;
    version: number;
  } & { isPrivate: boolean },
  viewerId: string | null,
) => Promise<{
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}>;

export type AccountViewsByIdsReader = (
  accountIds: string[],
  viewerId: string | null,
) => Promise<
  Array<{
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  }>
>;
