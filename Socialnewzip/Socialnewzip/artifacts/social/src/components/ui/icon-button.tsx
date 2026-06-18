import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const iconButtonVariants = cva(
  "inline-flex items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 flex-shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:opacity-90",
        ghost: "text-muted-foreground hover:text-foreground hover:bg-muted",
        surface: "bg-card border border-border text-foreground hover:bg-muted",
        brand: "bg-primary/10 text-primary hover:bg-primary/20",
        destructive: "text-destructive hover:bg-destructive/10",
      },
      size: {
        xs: "w-7 h-7 [&_svg]:w-3.5 [&_svg]:h-3.5",
        sm: "w-8 h-8 [&_svg]:w-4 [&_svg]:h-4",
        md: "w-9 h-9 [&_svg]:w-5 [&_svg]:h-5",
        lg: "w-11 h-11 [&_svg]:w-5 [&_svg]:h-5",
        xl: "w-14 h-14 [&_svg]:w-6 [&_svg]:h-6",
      },
    },
    defaultVariants: {
      variant: "ghost",
      size: "md",
    },
  }
);

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  label?: string;
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant, size, label, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        aria-label={label}
        className={cn(iconButtonVariants({ variant, size, className }))}
        {...props}
      >
        {children}
      </button>
    );
  }
);
IconButton.displayName = "IconButton";

export { IconButton, iconButtonVariants };
