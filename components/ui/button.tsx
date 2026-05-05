"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "outline" | "ghost";

const variantClasses: Record<ButtonVariant, string> = {
  default:
    "bg-zinc-100 text-zinc-950 hover:bg-zinc-200 border border-zinc-200 shadow-sm",
  outline: "border border-zinc-700 bg-transparent text-zinc-100 hover:bg-zinc-800",
  ghost: "bg-transparent text-zinc-100 hover:bg-zinc-800/70",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
          variantClasses[variant],
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
