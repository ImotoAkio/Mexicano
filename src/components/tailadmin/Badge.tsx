import React from "react";

export type BadgeVariant = "light" | "solid";
export type BadgeSize = "sm" | "md";
export type BadgeColor =
  | "primary"
  | "brand"
  | "success"
  | "error"
  | "warning"
  | "info"
  | "light"
  | "dark";

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  color?: BadgeColor;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = "light",
  color = "primary",
  size = "md",
  startIcon,
  endIcon,
  children,
  className = "",
}) => {
  const baseStyles =
    "inline-flex items-center justify-center gap-1.5 rounded-full font-medium transition-colors";

  const sizeStyles = {
    sm: "px-2 py-0.5 text-xs leading-none",
    md: "px-2.5 py-1 text-xs font-semibold leading-normal",
  };

  const variants = {
    light: {
      primary: "bg-blue-50 text-blue-700 border border-blue-200/80",
      brand: "bg-brand-50 text-brand-700 border border-brand-200/80",
      success: "bg-emerald-50 text-emerald-700 border border-emerald-200/80",
      error: "bg-rose-50 text-rose-700 border border-rose-200/80",
      warning: "bg-amber-50 text-amber-800 border border-amber-200/80",
      info: "bg-sky-50 text-sky-700 border border-sky-200/80",
      light: "bg-slate-100 text-slate-700 border border-slate-200",
      dark: "bg-slate-800 text-white border border-slate-700",
    },
    solid: {
      primary: "bg-blue-600 text-white shadow-xs",
      brand: "bg-brand-500 text-white shadow-xs",
      success: "bg-emerald-600 text-white shadow-xs",
      error: "bg-rose-600 text-white shadow-xs",
      warning: "bg-amber-500 text-white shadow-xs",
      info: "bg-sky-600 text-white shadow-xs",
      light: "bg-slate-200 text-slate-800",
      dark: "bg-slate-900 text-white shadow-xs",
    },
  };

  const sizeClass = sizeStyles[size];
  const colorStyles = variants[variant][color] || variants[variant].primary;

  return (
    <span className={`${baseStyles} ${sizeClass} ${colorStyles} ${className}`}>
      {startIcon && <span className="shrink-0 flex items-center">{startIcon}</span>}
      <span>{children}</span>
      {endIcon && <span className="shrink-0 flex items-center">{endIcon}</span>}
    </span>
  );
};

export default Badge;
