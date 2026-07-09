import { HTMLAttributes } from "react";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse bg-[var(--surface-2)] rounded-[6px] ${className}`}
      {...props}
    />
  );
}

export function LedgerRowSkeleton() {
  return (
    <div className="ledger-row border-b border-[var(--border)] py-4 flex flex-col md:grid md:grid-cols-[100px_1fr_140px_140px] gap-4 md:gap-0 animate-pulse">
      <div className="mb-2 md:mb-0">
        <Skeleton className="h-5 w-16" />
      </div>
      <div className="flex flex-col gap-2 pr-4 py-1">
        <div className="flex gap-2 items-center">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-3.5 w-1/3 mt-1" />
        <Skeleton className="h-4 w-5/6 mt-1" />
      </div>
      <div className="my-2 md:my-0">
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="h-8 w-24">
        <Skeleton className="h-full w-full" />
      </div>
    </div>
  );
}

export function StatBlockSkeleton() {
  return (
    <div className="ledger-tab border border-[var(--border)] p-4 flex flex-col gap-2 animate-pulse">
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className="h-8 w-12 mt-1" />
    </div>
  );
}
