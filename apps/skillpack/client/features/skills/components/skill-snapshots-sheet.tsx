import type {
  ResolvedSkill,
  SkillSnapshotItem,
} from "@skillpack/contracts/skills/responses";
import { formatDistanceToNow } from "date-fns";
import { RotateCcwIcon } from "lucide-react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface SkillSnapshotsSheetProps {
  open: boolean;
  skill: ResolvedSkill | undefined;
  snapshots: SkillSnapshotItem[];
  snapshotsStatus: string;
  onOpenChange: (open: boolean) => void;
  onRestoreSnapshot: (snapshotNumber: number) => Promise<void>;
}

export const SkillSnapshotsSheet = ({
  open,
  skill,
  snapshots,
  snapshotsStatus,
  onOpenChange,
  onRestoreSnapshot,
}: SkillSnapshotsSheetProps) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent className="sm:max-w-xl">
      <SheetHeader>
        <SheetTitle>Snapshots</SheetTitle>
      </SheetHeader>
      <OverlayScrollbarsComponent
        defer
        options={{
          scrollbars: { autoHide: "leave", theme: "os-theme-dark" },
        }}
        className="min-h-0 flex-1"
      >
        {snapshots.length ? (
          snapshots.map((snapshot) => (
            <div
              key={snapshot.snapshotNumber}
              className="flex items-center justify-between gap-3 border-b border-border px-6 py-3 text-sm hover:bg-muted/40"
            >
              <div className="grid min-w-0 flex-1 gap-1">
                <span className="truncate font-medium">
                  Snapshot #{snapshot.snapshotNumber}
                  {snapshot.label ? ` · ${snapshot.label}` : ""}
                </span>
                <span className="text-xs text-muted-foreground">
                  {snapshot.name}
                  {" · "}
                  {formatDistanceToNow(new Date(snapshot.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!skill}
                onClick={() => {
                  void onRestoreSnapshot(snapshot.snapshotNumber);
                }}
              >
                <RotateCcwIcon />
                Restore
              </Button>
            </div>
          ))
        ) : (
          <p className="px-6 py-4 text-sm text-muted-foreground">
            {snapshotsStatus}
          </p>
        )}
      </OverlayScrollbarsComponent>
    </SheetContent>
  </Sheet>
);
