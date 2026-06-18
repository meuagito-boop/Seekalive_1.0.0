import * as React from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
}

const PageContainer = React.forwardRef<HTMLDivElement, PageContainerProps>(
  ({ className, padded = false, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col min-h-full pb-6",
        padded && "px-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
PageContainer.displayName = "PageContainer";

export { PageContainer };
