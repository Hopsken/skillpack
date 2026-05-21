import { FileTextIcon, RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

type EmptyLibraryProps = {
  status: string;
  onRefresh: () => void;
};

export function EmptyLibrary({ status, onRefresh }: EmptyLibraryProps) {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-card px-6 text-center">
      <FileTextIcon className="text-muted-foreground" />
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold tracking-tight">No skills yet</h2>
        <p className="max-w-md text-sm text-muted-foreground">{status}</p>
      </div>
      <Button variant="secondary" onClick={onRefresh}>
        <RefreshCwIcon data-icon="inline-start" />
        Refresh catalog
      </Button>
    </div>
  );
}
