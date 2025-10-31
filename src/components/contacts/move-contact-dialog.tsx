'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, X, Move as MoveIcon } from 'lucide-react';
import { getGroupes } from '@/lib/api/groupes';
import { moveContact } from '@/lib/api/contacts';
import { toast } from 'sonner';
import { getUserFromCookies } from '@/lib/auth';

interface MoveContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: {
    id: string;
    contactName: string;
    contactNumber: string;
    groupName?: string;
  };
  onSuccess?: () => void;
}

export function MoveContactDialog({ 
  open, 
  onOpenChange, 
  contact, 
  onSuccess 
}: MoveContactDialogProps) {
  const [groups, setGroups] = useState<Array<{id: string, nomGroupe: string, isCurrent?: boolean}>>([]);
  const [currentGroupId, setCurrentGroupId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadGroups = async () => {
      try {
        setLoading(true);
        // Récupérer les informations utilisateur depuis les cookies
        const user = getUserFromCookies();
        if (!user) {
          throw new Error('Utilisateur non connecté');
        }
        
        // Vérifier si l'utilisateur a un ID client
        if (!user.id) {
          throw new Error('Impossible de récupérer l\'ID de l\'utilisateur');
        }
        
        const data = await getGroupes(user.id);
        console.log('Groupes chargés:', data);
        
        // Préparer la liste des groupes en marquant le groupe actuel
        const currentGroup = data.find(g => g.nomGroupe === contact.groupName);
        const currentGroupId = currentGroup?.idClientsGroups || '';
        
        const allGroups = data.map(group => ({
          id: group.idClientsGroups,
          nomGroupe: group.nomGroupe,
          isCurrent: group.idClientsGroups === currentGroupId
        }));
        
        setGroups(allGroups);
        setCurrentGroupId(currentGroupId);
        
        // Sélectionner le premier groupe qui n'est pas le groupe actuel
        const firstNonCurrentGroup = allGroups.find(g => !g.isCurrent);
        if (firstNonCurrentGroup) {
          setSelectedGroupId(firstNonCurrentGroup.id);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des groupes:', error);
        toast.error('Erreur lors du chargement des groupes');
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      loadGroups();
    }
  }, [open, contact.id]);

  const handleMoveContact = async () => {
    if (!selectedGroupId) return;
    
    try {
      setSubmitting(true);
      await moveContact(contact.id, selectedGroupId);
      toast.success('Contacto movido correctamente');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error al mover el contacto:', error);
      toast.error('Error al mover el contacto');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MoveIcon className="h-5 w-5" />
            Mover contacto
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          {/* Section gauche : Informations du contact */}
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-medium text-lg">Información del contacto</h3>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Nombre</p>
                <p className="font-medium">{contact.contactName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Teléfono</p>
                <p className="font-medium">{contact.contactNumber}</p>
              </div>
              {contact.groupName && (
                <div>
                  <p className="text-sm text-muted-foreground">Grupo actual</p>
                  <p className="font-medium">{contact.groupName}</p>
                </div>
              )}
            </div>
          </div>

          {/* Section droite : Liste des groupes */}
          <div className="flex flex-col h-full">
            <h3 className="font-medium text-lg mb-4">Seleccionar grupo de destino</h3>
            
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : groups.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-muted-foreground text-sm">No hay grupos disponibles</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto pr-2 space-y-2 max-h-[calc(100vh-300px)]">
                {groups.map((group) => {
                  const isCurrent = group.id === currentGroupId;
                  const isSelected = selectedGroupId === group.id;
                  
                  return (
                    <div 
                      key={group.id}
                      className={`p-3 border rounded-md transition-colors ${
                        isCurrent 
                          ? 'bg-muted/30 cursor-not-allowed opacity-70' 
                          : 'cursor-pointer hover:bg-muted/50'
                      } ${
                        isSelected ? 'bg-primary/10 border-primary' : ''
                      }`}
                      onClick={() => !isCurrent && setSelectedGroupId(group.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="font-medium">{group.nomGroupe}</span>
                          {isCurrent && (
                            <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded-full">
                              Grupo actual
                            </span>
                          )}
                        </div>
                        {isSelected && !isCurrent && (
                          <div className="h-2 w-2 rounded-full bg-primary" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end pt-4 gap-2 mt-4 border-t pt-4">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleMoveContact}
                disabled={!selectedGroupId || submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Moviendo...
                  </>
                ) : (
                  'Mover contacto'
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
