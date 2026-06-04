import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { validateNewResourcePath } from "../lib/resource-drafts";

interface AddResourceDialogProps {
  existingPaths: Set<string>;
  open: boolean;
  onAdd: (path: string) => void;
  onOpenChange: (open: boolean) => void;
}

export const AddResourceDialog = ({
  existingPaths,
  open,
  onAdd,
  onOpenChange,
}: AddResourceDialogProps) => {
  const [path, setPath] = useState("");
  const trimmedPath = path.trim();
  const error = trimmedPath
    ? validateNewResourcePath(trimmedPath, existingPaths)
    : null;
  const canAdd = Boolean(trimmedPath && !error);

  useEffect(() => {
    if (!open) {
      setPath("");
    }
  }, [open]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canAdd) {
      return;
    }

    onAdd(trimmedPath);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Add file</DialogTitle>
            <DialogDescription>
              Enter a safe relative file path, for example references/notes.md.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="resource-path">File name</Label>
            <Input
              id="resource-path"
              aria-invalid={Boolean(error)}
              autoComplete="off"
              autoFocus
              placeholder="references/notes.md"
              value={path}
              onChange={(event) => setPath(event.target.value)}
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canAdd}>
              Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
