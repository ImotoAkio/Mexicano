import React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";

export interface PageHeaderProps {
  pageTitle: string;
  subtitle?: string;
  breadcrumbs?: { label: string; href?: string; onClick?: () => void }[];
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  pageTitle,
  subtitle,
  breadcrumbs = [{ label: "Financeiro" }, { label: pageTitle }],
  actions,
  className = "",
}) => {
  return (
    <div className={cn("mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4", className)}>
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="mb-1.5">
            <ol className="flex items-center gap-1.5 text-xs text-slate-500">
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <React.Fragment key={idx}>
                    {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                    <li className={cn(isLast ? "font-semibold text-slate-800" : "hover:text-slate-700")}>
                      {crumb.onClick ? (
                        <button onClick={crumb.onClick} className="hover:underline cursor-pointer">
                          {crumb.label}
                        </button>
                      ) : (
                        crumb.label
                      )}
                    </li>
                  </React.Fragment>
                );
              })}
            </ol>
          </nav>
        )}
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          {pageTitle}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-slate-500 font-normal">
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
