import { Camera } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User } from "@/modules/profile/types/user";

export function ProfileEditHeader({ user }: { user: User }) {
  return (
    <div className="relative mb-16">
      <div className="group relative h-36 cursor-pointer overflow-hidden bg-gradient-to-br from-primary/20 via-accent/20 to-background">
        <img src={user.coverUrl} alt="Cover" className="h-full w-full object-cover" />
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          <Camera className="h-8 w-8 text-white" />
        </div>
      </div>
      <div className="group absolute -bottom-12 left-4 cursor-pointer">
        <Avatar className="h-24 w-24 border-4 border-background">
          <AvatarImage src={user.avatarUrl} />
          <AvatarFallback className="text-2xl">{user.displayName[0]}</AvatarFallback>
        </Avatar>
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
          <Camera className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
}
