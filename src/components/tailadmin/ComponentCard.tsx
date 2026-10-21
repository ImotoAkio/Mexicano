import React from "react";
import { cn } from "../../lib/utils";

export interface ComponentCardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
}

export const ComponentCard: React.FC<ComponentCardProps> = ({
  title,
  subtitle,
  action,
  children,
  className = "",
  headerClassName = "",
  bodyClassName = "",
}) => {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden transition-all duration-200",
        className
      )}
    >
      {(title || action || subtitle) && (
        <div
          className={cn(
            "flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4.5 border-b border-slate-100",
            headerClassName
          )}
        >
          <div>
            {typeof title === "string" ? (
              <h3 className="text-base font-semibold text-slate-900 tracking-tight">
                {title}
              </h3>
            ) : (
              title
            )}
            {subtitle && (
              <p className="mt-0.5 text-xs font-normal text-slate-500">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
        </div>
      )}

      <div className={cn("p-5 sm:p-6", bodyClassName)}>{children}</div>
    </div>
  );
};

export default ComponentCard;
