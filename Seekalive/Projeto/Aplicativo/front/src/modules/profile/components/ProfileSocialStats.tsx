import { Link } from "wouter";
import { formatCount } from "@/lib/formatters";
import type { User } from "@/modules/profile/types/user";

type ProfileSocialStatsProps = {
  circleCount: number;
  isMe: boolean;
  profile: Pick<User, "username" | "stats">;
};

export function ProfileSocialStats({
  circleCount,
  isMe,
  profile,
}: ProfileSocialStatsProps) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
      <Link
        href={`/profile/${profile.username}/following`}
        className="hover:underline"
        data-testid="link-following"
      >
        <span className="font-bold">
          {formatCount(profile.stats.following)}
        </span>
        <span className="ml-1 text-muted-foreground">Seguindo</span>
      </Link>
      <Link
        href={`/profile/${profile.username}/followers`}
        className="hover:underline"
        data-testid="link-followers"
      >
        <span className="font-bold">
          {formatCount(profile.stats.followers)}
        </span>
        <span className="ml-1 text-muted-foreground">Seguidores</span>
      </Link>
      {isMe ? (
        <Link
          href={`/profile/${profile.username}/circles`}
          className="hover:underline"
          data-testid="link-circles"
        >
          <span className="font-bold">{formatCount(circleCount)}</span>
          <span className="ml-1 text-muted-foreground">Círculo</span>
        </Link>
      ) : (
        <span className="text-muted-foreground" data-testid="stat-circles">
          <span className="font-bold text-foreground">
            {formatCount(circleCount)}
          </span>
          <span className="ml-1">Círculo</span>
        </span>
      )}
    </div>
  );
}
