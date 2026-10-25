import type { ElementType, ReactNode } from "react";

interface UnavailableSecurityOptionProps {
  icon: ElementType;
  title: string;
  description: string;
  control?: ReactNode;
}

export function UnavailableSecurityOption({
  icon: Icon,
  title,
  description,
  control,
}: UnavailableSecurityOptionProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {control}
    </div>
  );
}
