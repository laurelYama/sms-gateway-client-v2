'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, MoreVertical, Pencil, Trash2, Users, X, Search, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { getGroupes, deleteGroupe, Groupe } from '@/lib/api/groupes';
import { GroupeForm } from '@/components/groupes/groupe-form';
import { getUserFromCookies } from '@/lib/auth';
import { toast } from 'sonner';
import { API_ENDPOINTS } from '@/config/api';

export default function GroupesPage() {
  const router = useRouter();
  const [groupes, setGroupes] = useState<Array<Groupe & { contactCount?: number }>>([]);
  const [filteredGroupes, setFilteredGroupes] = useState<Array<Groupe & { contactCount?: number }>>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingGroupe, setEditingGroupe] = useState<Groupe | null>(null);
  const [user, setUser] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(5);
  const [totalItems, setTotalItems] = useState(0);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[DEBUG] Chargement des données utilisateur...');
      const userData = await getUserFromCookies();
      console.log('[DEBUG] Données utilisateur:', userData);
      
      if (!userData) {
        throw new Error('Aucune donnée utilisateur trouvée');
      }
      
      setUser(userData);
      
      if (!userData.id) {
        throw new Error('ID utilisateur manquant');
      }
      
      console.log('[DEBUG] Récupération des groupes pour le client ID:', userData.id);
      const data = await getGroupes(userData.id);
      
      if (!Array.isArray(data)) {
        console.error('[ERROR] Les données reçues ne sont pas un tableau:', data);
        throw new Error('Format de données invalide reçu du serveur');
      }
      
      console.log(`[DEBUG] ${data.length} groupes récupérés`);
      
      // Trier par date de création (du plus récent au plus ancien)
      const sortedData = [...data].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      // Pour le débogage, afficher les IDs des groupes
      console.log('[DEBUG] IDs des groupes:', sortedData.map(g => g.idClientsGroups));
      
      // D'abord, récupérer tous les contacts une seule fois
      try {
        console.log('[DEBUG] Récupération de tous les contacts...');
        const token = document.cookie.split('; ').find(row => row.startsWith('authToken='))?.split('=')[1];
        if (!token) throw new Error('Token non trouvé');
        
        const response = await fetch(
          API_ENDPOINTS.CONTACTS_BY_CLIENT(userData.id),
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
            },
          }
        );
        
        if (!response.ok) {
          throw new Error(`Erreur ${response.status}: ${response.statusText}`);
        }
        
        const allContacts = await response.json();
        console.log('[DEBUG] Tous les contacts récupérés:', allContacts);
        
        // Compter les contacts par groupe
        const groupesAvecCompteur = sortedData.map(groupe => {
          const count = allContacts.filter((contact: any) => 
            contact.clientsGroup?.idClientsGroups === groupe.idClientsGroups
          ).length;
          
          console.log(`[DEBUG] Groupe ${groupe.nomGroupe} (${groupe.idClientsGroups}): ${count} contacts`);
          
          return {
            ...groupe,
            contactCount: count
          };
        });
        
        console.log('[DEBUG] Groupes avec compteur:', groupesAvecCompteur);
        setGroupes(groupesAvecCompteur);
        setFilteredGroupes(groupesAvecCompteur);
        return;
        
      } catch (error) {
        console.error('[ERROR] Erreur lors de la récupération des contacts:', error);
        // En cas d'erreur, on initialise les compteurs à 0
        const groupesAvecCompteur = sortedData.map(groupe => ({
          ...groupe,
          contactCount: 0
        }));
        
        setGroupes(groupesAvecCompteur);
        setFilteredGroupes(groupesAvecCompteur);
        return;
      }
      
      console.log('[DEBUG] Groupes avec compteur:', groupesAvecCompteur);
      setGroupes(groupesAvecCompteur);
      setFilteredGroupes(groupesAvecCompteur);
      
    } catch (error) {
      console.error('[ERROR] Erreur lors du chargement des groupes:', error);
      
      if (error instanceof Error) {
        toast.error(`Erreur: ${error.message}`, {
          description: 'Veuillez réessayer ou contacter le support si le problème persiste.',
          action: {
            label: 'Réessayer',
            onClick: () => loadData()
          }
        });
      } else {
        toast.error('Une erreur inconnue est survenue lors du chargement des groupes');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredGroupes(groupes);
    } else {
      const filtered = groupes.filter(groupe =>
        groupe.nomGroupe.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredGroupes(filtered);
    }
  }, [searchTerm, groupes]);

  // Pagination
  useEffect(() => {
    if (filteredGroupes.length > 0) {
      setTotalItems(filteredGroupes.length);
      
      // Ajuster la page actuelle si nécessaire
      const totalPages = Math.ceil(filteredGroupes.length / pageSize);
      if (page > totalPages && totalPages > 0) {
        setPage(totalPages);
      }
      
      // Appliquer la pagination
      const startIndex = (page - 1) * pageSize;
      const paginatedData = filteredGroupes.slice(startIndex, startIndex + pageSize);
      setCurrentItems(paginatedData);
    } else {
      setCurrentItems([]);
      setTotalItems(0);
    }
  }, [filteredGroupes, page, pageSize]);
  
  const [currentItems, setCurrentItems] = useState<Groupe[]>([]);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const paginate = (pageNumber: number) => setPage(pageNumber);

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce groupe ?')) return;
    
    try {
      await deleteGroupe(id);
      setGroupes(groupes.filter(groupe => groupe.idClientsGroups !== id));
      toast.success('Groupe supprimé avec succès');
    } catch (error) {
      console.error('Erreur lors de la suppression du groupe:', error);
      toast.error('Erreur lors de la suppression du groupe');
    }
  };

  const handleEdit = (groupe: Groupe) => {
    setEditingGroupe(groupe);
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      setEditingGroupe(null);
      setIsCreateDialogOpen(false);
    } else {
      setIsCreateDialogOpen(true);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Groupes</h1>
          <Button disabled size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Créer un groupe
          </Button>
        </div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-md animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col space-y-4 mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold">Groupes</h1>
          <Dialog open={isCreateDialogOpen || !!editingGroupe} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => setIsCreateDialogOpen(true)} 
                size="default"
                className="gap-2 px-4 py-2 text-base"
              >
                <Plus className="h-5 w-5" />
                <span>Créer un groupe</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader className="sr-only">
                <DialogTitle>
                  {editingGroupe ? 'Modifier le groupe' : 'Créer un groupe'}
                </DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <GroupeForm 
                  groupeId={editingGroupe?.idClientsGroups}
                  onSuccess={() => {
                    handleDialogOpenChange(false);
                    loadData();
                  }}
                  onCancel={() => handleDialogOpenChange(false)}
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Rechercher un groupe..."
            className="pl-10 w-full max-w-md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card className="border rounded-lg">
        <CardContent className="p-0">
          {filteredGroupes.length === 0 ? (
            <div className="text-center p-8">
              <Users className="mx-auto h-10 w-10 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">Aucun groupe pour le moment</p>
              <Button 
                onClick={() => {
                  setEditingGroupe(null);
                  setIsCreateDialogOpen(true);
                }} 
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Créer un groupe
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Contacts</TableHead>
                    <TableHead>Date de création</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentItems.map((groupe) => (
                    <TableRow key={groupe.idClientsGroups}>
                      <TableCell className="font-medium">
                        {groupe.nomGroupe}
                      </TableCell>
                      <TableCell className="text-gray-500">{groupe.descriptionGroupe || '-'}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {groupe.contactCount || 0} contact{groupe.contactCount !== 1 ? 's' : ''}
                        </span>
                      </TableCell>
                      <TableCell>
                        {groupe.createdAt ? new Date(groupe.createdAt).toLocaleDateString('fr-FR') : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(groupe)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              <span>Modifier</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => handleDelete(groupe.idClientsGroups)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Supprimer</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {/* Pagination */}
              {totalItems > 0 && (
                <div className="flex items-center justify-between px-2 py-4">
                  <div className="text-sm text-muted-foreground">
                    Affichage de {(page - 1) * pageSize + 1} à{' '}
                    {Math.min(page * pageSize, totalItems)} sur {totalItems} groupes
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => paginate(1)}
                      disabled={page === 1}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => paginate(Math.max(1, page - 1))}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => paginate(totalPages)}
                      disabled={page >= totalPages}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
