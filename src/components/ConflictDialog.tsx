

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';

interface ConflictDialogProps {
  open: boolean;
  onReload: () => void;
  onDiscard: () => void;
}

export function ConflictDialog({ open, onReload, onDiscard }: ConflictDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="bg-card border-border">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            Conflict Detected
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            This task was modified by someone else while you were editing.
            Your changes could not be saved. Please reload the latest version
            and try again.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onDiscard}>
            Discard my changes
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onReload}
            className="bg-gradient-primary text-primary-foreground hover:opacity-90"
          >
            Reload &amp; retry
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
