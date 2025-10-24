'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Loader2, X, Edit, Save, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { fetchEmetteurs, createEmetteur, updateEmetteur, deleteEmetteur, type Emetteur } from '@/lib/api/emetteurs';
import { getUserFromCookies } from '@/lib/auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function EmetteurPage() {
  const [emetteurs, setEmetteurs] = useState<Emetteur[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newEmetteur, setNewEmetteur] = useState('');
  const [editingEmetteur, setEditingEmetteur] = useState<Emetteur | null>(null);
  const [clientId, setClientId] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [emetteurToDelete, setEmetteurToDelete] = useState<string | null>(null);

  // Charger les émetteurs et les informations du client
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setEmetteurs([]); // Réinitialiser la liste
        
        const user = getUserFromCookies();
        console.log('User from cookies:', user);
        
        if (!user) {
          console.log('Aucun utilisateur connecté, redirection vers /login');
          window.location.href = '/login';
          return;
        }
        
        // Si l'utilisateur est connecté mais n'a pas de clientId, on essaie de récupérer les émetteurs quand même
        if (!user.clientId) {
          console.warn('Aucun clientId trouvé dans les données utilisateur');
        } else {
          setClientId(user.clientId);
        }
        
        try {
          const data = await fetchEmetteurs();
          setEmetteurs(data);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Une erreur inconnue est survenue';
          console.error('Erreur lors du chargement des émetteurs:', error);
          
          // Ne pas rediriger automatiquement, afficher un message d'erreur à la place
          toast.error(`Impossible de charger la liste des émetteurs: ${errorMessage}`, {
            icon: <AlertCircle className="h-5 w-5 text-destructive" />,
            sound: true,
            duration: 5000,
          });
        }
      } catch (error) {
        console.error('Erreur inattendue:', error);
        toast.error('Une erreur inattendue est survenue lors du chargement des émetteurs', {
          icon: <AlertCircle className="h-5 w-5 text-destructive" />,
          sound: true,
          duration: 5000,
        });
      } finally {
        setLoading(false);
      }
    };

    // Délai pour éviter les boucles de redirection
    const timer = setTimeout(() => {
      loadData();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      setEditingEmetteur(null);
      setNewEmetteur('');
    }
    setIsDialogOpen(open);
  };

  const handleEditEmetteur = (emetteur: Emetteur) => {
    setEditingEmetteur(emetteur);
    setNewEmetteur(emetteur.nom);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (emetteurId: string) => {
    setEmetteurToDelete(emetteurId);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!emetteurToDelete) return;
    
    try {
      await deleteEmetteur(emetteurToDelete);
      
      // Mettre à jour la liste des émetteurs
      setEmetteurs(emetteurs.filter(e => e.id !== emetteurToDelete));
      
      toast.success('Émetteur supprimé avec succès', {
        icon: <Trash2 className="h-5 w-5 text-green-500" />,
        duration: 3000,
      });
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'émetteur:', error);
      toast.error('Impossible de supprimer l\'émetteur', {
        icon: <XCircle className="h-5 w-5 text-destructive" />,
        duration: 5000,
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setEmetteurToDelete(null);
    }
  };

  const handleAddEmetteur = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const nomEmetteur = editingEmetteur ? editingEmetteur.nom : newEmetteur;
    const nomTronque = nomEmetteur.trim();
    
    // Validation du formulaire
    if (!nomTronque) {
      toast.error('Veuillez saisir un nom d\'émetteur', {
        icon: <AlertCircle className="h-5 w-5 text-destructive" />,
        duration: 3000,
      });
      return false;
    }

    if (nomTronque.length < 2) {
      toast.error('Le nom de l\'émetteur doit contenir au moins 2 caractères', {
        icon: <AlertCircle className="h-5 w-5 text-destructive" />,
        duration: 3000,
      });
      return false;
    }
    
    try {
      setAdding(true);
      
      if (editingEmetteur) {
        // Mise à jour de l'émetteur existant
        const updatedEmetteur = await updateEmetteur(editingEmetteur.id, nomTronque);
        
        // Mise à jour optimiste de l'interface
        setEmetteurs(prevEmetteurs => 
          prevEmetteurs.map(e => 
            e.id === updatedEmetteur.id ? { ...e, ...updatedEmetteur } : e
          )
        );
        
        toast.success('Émetteur mis à jour avec succès', {
          icon: <Save className="h-5 w-5 text-green-500" />,
          duration: 3000,
        });
      } else {
        // Création d'un nouvel émetteur
        const user = getUserFromCookies();
        
        // Utiliser typeCompte comme fallback si clientId n'est pas disponible
        const clientId = user?.clientId || user?.typeCompte;
        
        if (!clientId) {
          console.error('Aucun clientId ou typeCompte trouvé pour l\'utilisateur connecté');
          toast.error('Impossible de récupérer les informations du client', {
            icon: <XCircle className="h-5 w-5 text-destructive" />,
            duration: 5000,
          });
          return false;
        }
        
        const emetteurData = {
          clientId: clientId,
          nom: nomTronque,
        };
        
        const newEmetteurData = await createEmetteur(emetteurData);
        
        // Mise à jour optimiste de l'interface
        setEmetteurs(prev => [...prev, newEmetteurData]);
        
        // Réinitialiser le champ de saisie
        setNewEmetteur('');
        
        toast.success('Émetteur ajouté avec succès', {
          icon: <Plus className="h-5 w-5 text-green-500" />,
          duration: 3000,
        });
      }
      
      // Réinitialisation des états
      setNewEmetteur('');
      setEditingEmetteur(null);
      setIsDialogOpen(false);
      return true;
      
    } catch (error) {
      console.error('Erreur lors de l\'opération sur l\'émetteur:', error);
      const errorMessage = error instanceof Error ? error.message : 'Une erreur inconnue est survenue';
      toast.error(`Échec de l'opération: ${errorMessage}`, {
        icon: <XCircle className="h-5 w-5 text-destructive" />,
        duration: 5000,
      });
      return false;
    } finally {
      setAdding(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return 'Date inconnue';
      
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Date invalide';
      
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      console.error('Erreur de format de date:', error);
      return 'Date invalide';
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mes émetteurs</h1>
          <p className="text-muted-foreground">
            Gérez les émetteurs autorisés pour l'envoi de SMS
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Bouton pour ouvrir la boîte de dialogue */}
        <div className="flex justify-end">
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un émetteur
          </Button>
        </div>

        {/* Boîte de dialogue d'ajout */}
        <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingEmetteur ? 'Modifier l\'émetteur' : 'Ajouter un émetteur'}</DialogTitle>
              <DialogDescription>
                {editingEmetteur 
                  ? 'Modifiez le nom de l\'émetteur' 
                  : 'Entrez le nom du nouvel émetteur'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={async (e) => {
      e.preventDefault();
      const shouldSubmit = await handleAddEmetteur(e);
      if (shouldSubmit) {
        setIsDialogOpen(false);
      }
    }} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="emetteur" className="text-sm font-medium leading-none">
                  Nom de l'émetteur
                </label>
                <Input
                  id="emetteur"
                  placeholder="Ex: SOCIETE"
                  value={editingEmetteur ? editingEmetteur.nom : newEmetteur}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (editingEmetteur) {
                      setEditingEmetteur({ ...editingEmetteur, nom: value });
                    } else {
                      setNewEmetteur(value);
                    }
                  }}
                  maxLength={11}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Le nom de l'émetteur ne peut pas dépasser 11 caractères
                </p>
              </div>
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => handleDialogOpenChange(false)}
                  disabled={adding}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={adding}>
                  {adding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingEmetteur ? 'Enregistrer' : 'Ajouter'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Supprimer l'émetteur</DialogTitle>
              <DialogDescription>
                Êtes-vous sûr de vouloir supprimer cet émetteur ? Cette action est irréversible.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={adding}
              >
                Annuler
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleConfirmDelete}
                disabled={adding}
              >
                {adding ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Supprimer
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Liste des émetteurs */}
        <Card>
          <CardHeader>
            <CardTitle>Liste des émetteurs</CardTitle>
            <CardDescription>
              {emetteurs.length} émetteur{emetteurs.length > 1 ? 's' : ''} enregistré{emetteurs.length > 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : emetteurs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucun émetteur enregistré
              </div>
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Créé le</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emetteurs.map((emetteur) => (
                      <TableRow key={emetteur.id}>
                        <TableCell className="font-medium">{emetteur.nom}</TableCell>
                        <TableCell>{formatDate(emetteur.createdAt)}</TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-primary hover:text-primary/80"
                            onClick={() => handleEditEmetteur(emetteur)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive hover:text-destructive/80"
                            onClick={() => handleDeleteClick(emetteur.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
