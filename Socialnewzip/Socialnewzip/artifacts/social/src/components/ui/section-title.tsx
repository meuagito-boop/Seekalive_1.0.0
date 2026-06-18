import * as React from "react";
import { cn } from "@/lib/utils";

interface SectionTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2" | "h3" | "h4";
  description?: string;
}

const SectionTitle = React.forwardRef<HTMLHeadingElement, SectionTitleProps>(
  ({ className, as: Tag = "h2", description, children, ...props }, ref) => (
    <div className="mb-4">
      <Tag
        ref={ref as React.Ref<HTMLHeadingElement>}
        className={cn("sk-text-section-title text-foreground", className)}
        {...props}
      >
        {children}
      </Tag>
      {description && (
        <p className="sk-text-caption text-muted-foreground mt-1">{description}</p>
      )}
    </div>
  )
);
SectionTitle.displayName = "SectionTitle";

export { SectionTitle };
