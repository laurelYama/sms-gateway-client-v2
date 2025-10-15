'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface DeleteContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  contactName: string;
  onConfirm: (contactId: string) => Promise<void>;
}

export function DeleteContactDialog({ 
  open, 
  onOpenChange, 
  contactId, 
  contactName,
  onConfirm 
}: DeleteContactDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    try {
      setLoading(true);
      await onConfirm(contactId);
      toast.success('Contact supprimé avec succès');
      onOpenChange(false);
    } catch (error) {
      console.error('Erreur lors de la suppression du contact:', error);
      toast.error(error instanceof Error ? error.message : 'Une erreur est survenue lors de la suppression');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Supprimer le contact</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <p>Êtes-vous sûr de vouloir supprimer le contact <strong>{contactName}</strong> ?</p>
          <p className="text-sm text-muted-foreground mt-2">Cette action est irréversible.</p>
        </div>
        
        <DialogFooter className="mt-4">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Annuler
          </Button>
          <Button 
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Supprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
