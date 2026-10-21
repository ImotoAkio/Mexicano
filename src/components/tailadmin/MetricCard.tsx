import React from "react";
import { cn } from "../../lib/utils";
import Badge, { BadgeColor } from "./Badge";

export interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBgColor?: string;
  badgeText?: string;
  badgeColor?: BadgeColor;
  badgeIcon?: React.ReactNode;
  subtitle?: string;
  className?: string;
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  iconBgColor = "bg-brand-50 text-brand-600 border border-brand-100",
  badgeText,
  badgeColor = "success",
  badgeIcon,
  subtitle,
  className = "",
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-2xl border border-slate-200/90 bg-white p-5 md:p-6 shadow-xs transition-all duration-200 hover:shadow-md",
        onClick && "cursor-pointer hover:border-brand-300",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-200",
            iconBgColor
          )}
        >
          {icon}
        </div>

        {badgeText && (
          <Badge color={badgeColor} size="sm" startIcon={badgeIcon}>
            {badgeText}
          </Badge>
        )}
      </div>

      <div className="mt-4 flex flex-col">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {title}
        </span>
        <h4 className="mt-1 text-2xl font-bold text-slate-900 tracking-tight">
          {value}
        </h4>
        {subtitle && (
          <span className="mt-1 text-xs text-slate-500 font-normal">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};

export default MetricCard;
