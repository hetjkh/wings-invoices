"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type DuplicateInvoiceNumberAlertProps = {
  open: boolean;
  existingNumber: string;
  suggestedNumber: string;
  onOpenChange: (open: boolean) => void;
  onUseSuggested: () => void;
};

const DuplicateInvoiceNumberAlert = ({
  open,
  existingNumber,
  suggestedNumber,
  onOpenChange,
  onUseSuggested,
}: DuplicateInvoiceNumberAlertProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Invoice number already exists</AlertDialogTitle>
          <AlertDialogDescription>
            Invoice #{existingNumber} is already in use. Use #{suggestedNumber}{" "}
            instead?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onUseSuggested}>
            Use #{suggestedNumber}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DuplicateInvoiceNumberAlert;
