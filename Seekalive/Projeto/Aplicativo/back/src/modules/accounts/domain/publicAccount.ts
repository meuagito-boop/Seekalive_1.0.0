export type PublicAccountRow = {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  locationLabel: string | null;
  websiteUrl: string | null;
  accountType: string;
  isPrivate: boolean;
  createdAt: Date;
  version: number;
};
