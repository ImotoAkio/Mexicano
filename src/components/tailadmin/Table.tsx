import React, { ReactNode } from "react";
import { cn } from "../../lib/utils";

interface TableProps {
  children: ReactNode;
  className?: string;
  wrapperClassName?: string;
}

export const Table: React.FC<TableProps> = ({ children, className = "", wrapperClassName = "" }) => {
  return (
    <div className={cn("overflow-x-auto subtle-scrollbar w-full", wrapperClassName)}>
      <table className={cn("min-w-full divide-y divide-slate-200 text-left text-sm", className)}>
        {children}
      </table>
    </div>
  );
};

export const TableHeader: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className = "",
}) => {
  return (
    <thead
      className={cn(
        "bg-slate-50/90 text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200",
        className
      )}
    >
      {children}
    </thead>
  );
};

export const TableBody: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className = "",
}) => {
  return (
    <tbody
      className={cn(
        "divide-y divide-slate-100 bg-white",
        className
      )}
    >
      {children}
    </tbody>
  );
};

export const TableRow: React.FC<{
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}> = ({ children, className = "", onClick }) => {
  return (
    <tr
      onClick={onClick}
      className={cn(
        "transition-colors duration-150 hover:bg-slate-50/80",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </tr>
  );
};

export const TableCell: React.FC<{
  children: ReactNode;
  isHeader?: boolean;
  className?: string;
  colSpan?: number;
}> = ({ children, isHeader = false, className = "", colSpan }) => {
  const Tag = isHeader ? "th" : "td";
  return (
    <Tag
      colSpan={colSpan}
      className={cn(
        isHeader
          ? "px-5 py-3.5 text-xs font-semibold text-slate-600 whitespace-nowrap"
          : "px-5 py-4 text-sm text-slate-700 align-middle",
        className
      )}
    >
      {children}
    </Tag>
  );
};

export default Table;
