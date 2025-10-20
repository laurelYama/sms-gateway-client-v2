"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogPortal,
  DialogOverlay,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

// Simple AlertDialog built on top of the existing Dialog primitives so we don't
// need to add a new dependency (@radix-ui/react-alert-dialog).
function AlertDialog({ children, open, onOpenChange }: { children: React.ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children}
    </Dialog>
  )
}

function AlertDialogContentWrapper({ children, className, ...props }: React.ComponentProps<typeof DialogContent>) {
  return (
    <DialogContent className={cn("max-w-lg", className)} {...props}>
      {children}
    </DialogContent>
  )
}

export {
  AlertDialog,
  AlertDialogContentWrapper as AlertDialogContent,
  DialogHeader as AlertDialogHeader,
  DialogFooter as AlertDialogFooter,
  DialogTitle as AlertDialogTitle,
  DialogDescription as AlertDialogDescription,
  DialogPortal as AlertDialogPortal,
  DialogOverlay as AlertDialogOverlay,
}
