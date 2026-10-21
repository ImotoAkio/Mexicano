import React, { ReactNode } from "react";
import { cn } from "../../lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "outline" | "danger" | "success" | "ghost";
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  size = "md",
  variant = "primary",
  startIcon,
  endIcon,
  className = "",
  disabled = false,
  isLoading = false,
  ...props
}) => {
  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs font-medium rounded-lg gap-1.5",
    md: "px-4 py-2 text-sm font-medium rounded-xl gap-2",
    lg: "px-5 py-2.5 text-base font-semibold rounded-xl gap-2.5",
  };

  const variantClasses = {
    primary:
      "bg-brand-500 text-white shadow-xs hover:bg-brand-600 active:bg-brand-700 disabled:opacity-50 transition-colors",
    outline:
      "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100 shadow-xs disabled:opacity-50 transition-colors",
    danger:
      "bg-rose-600 text-white shadow-xs hover:bg-rose-700 active:bg-rose-800 disabled:opacity-50 transition-colors",
    success:
      "bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 transition-colors",
    ghost:
      "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all duration-150 cursor-pointer disabled:cursor-not-allowed",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      ) : (
        startIcon && <span className="flex items-center shrink-0">{startIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && endIcon && <span className="flex items-center shrink-0">{endIcon}</span>}
    </button>
  );
};

export default Button;
