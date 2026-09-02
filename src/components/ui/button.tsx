import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--primary)] disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary: "bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white shadow-sm",
        accent: "bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white shadow-sm",
        secondary: "bg-[var(--surface-2)] hover:bg-[var(--border)] text-[var(--foreground)]",
        outline: "border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--foreground)]",
        ghost: "hover:bg-[var(--surface-2)] text-[var(--foreground)]",
        danger: "bg-red-600 hover:bg-red-700 text-white shadow-sm",
        success: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
);
Button.displayName = "Button";
