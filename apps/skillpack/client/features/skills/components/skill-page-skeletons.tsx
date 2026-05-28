import { Skeleton } from "@/components/ui/skeleton";

const managedSkillSkeletonRows = [
  "first",
  "second",
  "third",
  "fourth",
  "fifth",
  "sixth",
] as const;

export const ManagedSkillsSkeleton = () => (
  <>
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-6">
      <Skeleton className="h-5 w-28 rounded-md" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-16 rounded-md" />
        <Skeleton className="h-8 w-16 rounded-md" />
      </div>
    </header>
    <section className="min-h-0 flex-1">
      {managedSkillSkeletonRows.map((row) => (
        <div
          key={row}
          className="flex items-start justify-between gap-4 border-b border-border px-6 py-3"
        >
          <div className="grid min-w-0 flex-1 gap-2">
            <Skeleton className="h-4 w-48 rounded-md" />
            <Skeleton className="h-4 w-72 rounded-md" />
          </div>
          <Skeleton className="h-4 w-20 rounded-md" />
        </div>
      ))}
    </section>
  </>
);

export const SkillDetailSkeleton = () => (
  <>
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Skeleton className="size-8 rounded-md" />
        <Skeleton className="h-5 w-44 rounded-md" />
      </div>
      <Skeleton className="h-8 w-20 rounded-full" />
    </header>
    <div className="flex h-12 shrink-0 items-end gap-1 border-b border-border px-6">
      <Skeleton className="mb-3 h-4 w-20 rounded-md" />
      <Skeleton className="mb-3 h-4 w-20 rounded-md" />
      <Skeleton className="mb-3 h-4 w-20 rounded-md" />
    </div>
    <section className="min-h-0 flex-1 p-6">
      <div className="grid max-w-3xl gap-4">
        <Skeleton className="h-5 w-3/4 rounded-md" />
        <Skeleton className="h-4 w-full rounded-md" />
        <Skeleton className="h-4 w-11/12 rounded-md" />
        <Skeleton className="h-4 w-2/3 rounded-md" />
      </div>
    </section>
  </>
);
