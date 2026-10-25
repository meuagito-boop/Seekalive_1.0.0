import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_0_16px_hsl(var(--primary)/0.25)] hover:opacity-90 hover:shadow-[0_0_22px_hsl(var(--primary)/0.4)] active:scale-[0.97]",
        secondary:
          "bg-secondary text-secondary-foreground border border-border hover:bg-muted active:scale-[0.97]",
        ghost:
          "text-muted-foreground hover:text-foreground hover:bg-muted active:scale-[0.97]",
        outline:
          "border border-border bg-transparent text-foreground hover:bg-muted active:scale-[0.97]",
        destructive:
          "bg-destructive text-destructive-foreground hover:opacity-90 active:scale-[0.97]",
        danger:
          "bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 active:scale-[0.97]",
        link:
          "text-primary underline-offset-4 hover:underline p-0 h-auto",
        brand:
          "bg-primary text-primary-foreground font-bold rounded-full shadow-[0_0_20px_hsl(var(--primary)/0.3)] hover:opacity-90 hover:shadow-[0_0_28px_hsl(var(--primary)/0.45)] active:scale-[0.97]",
      },
      size: {
        default: "min-h-9 px-4 py-2",
        sm: "min-h-8 px-3 text-xs",
        lg: "min-h-11 px-6 text-base",
        xl: "min-h-12 px-8 text-base",
        icon: "h-9 w-9 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
