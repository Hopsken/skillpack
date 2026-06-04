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
    <header className="border-b border-border bg-background">
      <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-6 md:py-4">
        <Skeleton className="h-8 w-32 rounded-md" />
        <div className="hidden items-center gap-2 md:flex">
          <Skeleton className="h-8 w-28 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>
      </div>
      <div className="grid gap-4 px-4 pb-4 md:px-6 md:pb-6">
        <div className="grid gap-2">
          <Skeleton className="h-4 w-28 rounded-md" />
          <Skeleton className="h-8 w-full max-w-xl rounded-md" />
          <Skeleton className="h-4 w-full max-w-2xl rounded-md" />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-4 w-32 rounded-md" />
          <div className="grid gap-2 sm:flex sm:items-center">
            <Skeleton className="h-9 w-full rounded-md sm:w-32" />
            <Skeleton className="h-9 w-full rounded-md sm:w-32" />
          </div>
        </div>
      </div>
    </header>
    <section className="grid gap-3 px-4 py-4 md:px-6 md:py-6">
      {managedSkillSkeletonRows.map((row) => (
        <div
          key={row}
          className="rounded-3xl border border-border bg-card p-4 md:p-5"
        >
          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-5 w-40 rounded-md" />
              <Skeleton className="h-6 w-14 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full rounded-md" />
          </div>
        </div>
      ))}
    </section>
  </>
);

export const SkillDetailSkeleton = () => (
  <>
    <header className="border-b border-border bg-background px-4 py-3 md:px-6 md:py-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Skeleton className="size-8 rounded-md" />
          <div className="grid gap-2">
            <Skeleton className="h-4 w-24 rounded-md" />
            <Skeleton className="h-6 w-44 rounded-md" />
          </div>
        </div>
        <div className="grid gap-2 md:justify-items-end">
          <Skeleton className="h-4 w-24 rounded-md" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
        </div>
      </div>
    </header>
    <div className="border-b border-border px-4 py-3 md:hidden">
      <Skeleton className="h-9 w-full rounded-md" />
    </div>
    <section className="min-h-0 flex-1 p-4 md:p-6">
      <div className="grid max-w-3xl gap-4">
        <Skeleton className="h-5 w-3/4 rounded-md" />
        <Skeleton className="h-4 w-full rounded-md" />
        <Skeleton className="h-4 w-11/12 rounded-md" />
        <Skeleton className="h-4 w-2/3 rounded-md" />
      </div>
    </section>
  </>
);
