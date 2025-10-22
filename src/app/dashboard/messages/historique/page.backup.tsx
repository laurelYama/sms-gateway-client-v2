'use client';

import { useState, useEffect } from 'react';
import { getTokenFromCookies, getUserFromCookies } from "@/lib/auth";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { fetchMessages } from '@/lib/api/sms';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Icons
import { 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Inbox,
  MessageSquare,
  Search,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  Users,
  FileDown,
  Info
} from 'lucide-react';

type MessageType = 'unides' | 'muldes' | 'muldesp';

interface Message {
  ref: string;
  type: string;
  destinataire?: string;
  Destinataires?: string[];
  corps: string;
  emetteur: string;
  statut: string;
  createdAt: string;
}

export default function HistoriquePage() {
  const [activeTab, setActiveTab] = useState<MessageType>('unides');
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);
  const [displayedMessages, setDisplayedMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Ã‰tats pour la suppression
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(5);
  const [totalItems, setTotalItems] = useState(0);
  const [showAllRecipients, setShowAllRecipients] = useState(false);
  const [currentRecipients, setCurrentRecipients] = useState<string[]>([]);

  // Fonction pour supprimer un message
  const deleteMessage = async (ref: string) => {
    const token = await getTokenFromCookies();
    const user = await getUserFromCookies();
    const clientId = user?.id; // ChangÃ© de clientId Ã  id
    
    if (!clientId) {
      throw new Error('ID client non trouvÃ©');
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/sms/client/${clientId}/ref/${ref}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('DÃ©tails de l\'erreur:', errorData);
      throw new Error(errorData.message || 'Erreur lors de la suppression du message');
    }

    return response.json();
  };

  // Fonction pour supprimer tous les messages
  const deleteAllMessages = async () => {
    const token = await getTokenFromCookies();
    const user = await getUserFromCookies();
    const clientId = user?.id; // L'interface UserPayload contient un champ id
    
    if (!clientId) {
      throw new Error('ID client non trouvÃ©');
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/sms/client/${clientId}/all`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('DÃ©tails de l\'erreur:', errorData);
      throw new Error(errorData.message || 'Erreur lors de la suppression des messages');
    }

    return response.json();
  };

  // Gestion de la suppression des messages
  const handleDeleteClick = (messageRef: string) => {
    setMessageToDelete(messageRef);
    setDeleteDialogOpen(true);
  };

  const handleDeleteAllClick = () => {
    setDeleteAllDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!messageToDelete) return;
    
    try {
      setIsDeleting(true);
      await deleteMessage(messageToDelete);
      toast.success('Message supprimÃ© avec succÃ¨s');
      // Recharger les messages
      await fetchData();
    } catch (error) {
      console.error('Erreur lors de la suppression du message:', error);
      toast.error('Erreur lors de la suppression du message');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setMessageToDelete(null);
    }
  };

  const confirmDeleteAll = async () => {
    try {
      setIsDeleting(true);
      await deleteAllMessages();
      toast.success('Tous les messages ont Ã©tÃ© supprimÃ©s avec succÃ¨s');
      // Recharger les messages
      await fetchData();
    } catch (error) {
      console.error('Erreur lors de la suppression des messages:', error);
      toast.error('Erreur lors de la suppression des messages');
    } finally {
      setIsDeleting(false);
      setDeleteAllDialogOpen(false);
    }
  };

  // Afficher tous les destinataires dans une boÃ®te de dialogue
  const handleShowAllRecipients = (recipients: string[]) => {
    setCurrentRecipients(recipients);
    setShowAllRecipients(true);
  };

  // Charger les messages
  const fetchData = async () => {
    try {
      setIsLoading(true);
      // DÃ©sactiver temporairement la pagination cÃ´tÃ© client en rÃ©cupÃ©rant toutes les donnÃ©es
      const data = await fetchMessages(activeTab, 1, 1000); // AugmentÃ© la limite pour rÃ©cupÃ©rer plus de donnÃ©es
      setAllMessages(data.data);
      setError('');
      // Appliquer les filtres initiaux
      applyFilters(data.data);
    } catch (err) {
      setError('Erreur lors du chargement des messages');
      console.error('Erreur fetchData:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Appliquer les filtres, le tri par date et la pagination
  const applyFilters = (messages: Message[]) => {
    // Trier les messages par date (du plus rÃ©cent au plus ancien)
    let filtered = [...messages].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    // Filtrer par recherche
    if (searchQuery.trim()) {
      const searchLower = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(message => {
        // VÃ©rifier chaque champ de maniÃ¨re plus robuste
        const refMatch = message.ref?.toLowerCase().includes(searchLower) || false;
        const emetteurMatch = message.emetteur?.toLowerCase().includes(searchLower) || false;
        const corpsMatch = message.corps?.toLowerCase().includes(searchLower) || false;
        const destinataireMatch = message.destinataire?.toLowerCase().includes(searchLower) || false;
        const destinatairesMatch = message.Destinataires?.some(
          dest => dest?.toLowerCase().includes(searchLower)
        ) || false;
        
        return refMatch || emetteurMatch || corpsMatch || destinataireMatch || destinatairesMatch;
      });
    }
    
    setFilteredMessages(filtered);
    setTotalItems(filtered.length);
    
    // Mettre Ã  jour le nombre total de pages
    const newTotalPages = Math.ceil(filtered.length / pageSize);
    
    // Ajuster la page actuelle si nÃ©cessaire
    const newPage = page > newTotalPages && newTotalPages > 0 ? newTotalPages : page;
    if (newPage !== page) {
      setPage(newPage);
    }
    
    // Appliquer la pagination
    const startIndex = (newPage - 1) * pageSize;
    const paginatedData = filtered.slice(startIndex, startIndex + pageSize);
    setDisplayedMessages(paginatedData);
  };
  
  // Mettre Ã  jour les messages affichÃ©s quand les donnÃ©es, la recherche ou la page changent
  useEffect(() => {
    if (allMessages.length > 0) {
      applyFilters(allMessages);
    }
  }, [allMessages, searchQuery, page]);
  
  // Recharger les donnÃ©es quand l'onglet change
  useEffect(() => {
    setPage(1);
    setSearchQuery('');
    fetchData();
  }, [activeTab]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // La recherche est gÃ©rÃ©e par l'effet sur searchQuery
  };

  const totalPages = Math.ceil(totalItems / pageSize);

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'PPpp', { locale: fr });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, string> = {
      'EN_ATTENTE': 'En attente',
      'ENVOYE': 'EnvoyÃ©',
      'ECHEC': 'Ã‰chec',
      'ANNULE': 'AnnulÃ©',
      'EN_COURS': 'En cours',
      'TERMINE': 'TerminÃ©',
      'ERREUR': 'Erreur'
    } as const;

    const variantMap: Record<string, 'secondary' | 'default' | 'destructive' | 'outline' | 'success'> = {
      'EN_ATTENTE': 'secondary',
      'ENVOYE': 'default',
      'EN_COURS': 'secondary',
      'TERMINE': 'success',
      'ECHEC': 'destructive',
      'ERREUR': 'destructive',
      'ANNULE': 'outline'
    };

    return (
      <Badge variant={variantMap[status] || 'outline'}>
        {statusMap[status] || status}
      </Badge>
    );
  };

  // Ajuster la page actuelle si nÃ©cessaire
  const updatePagination = (filtered: Message[]) => {
    const newTotalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const newPage = page > newTotalPages && newTotalPages > 0 ? newTotalPages : page;
    
    if (newPage !== page) {
      setPage(newPage);
    }
    
    // Appliquer la pagination
    const startIndex = (newPage - 1) * pageSize;
    const paginatedData = filtered.slice(startIndex, startIndex + pageSize);
    setDisplayedMessages(paginatedData);
  };

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto px-4 py-6">
      {/* En-tÃªte fixe */}
      <div className="space-y-6 mb-6 flex-shrink-0">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              Historique des messages
            </h1>
            <p className="text-muted-foreground mt-1">
              Consultez l'historique complet de vos envois de messages
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg px-4 py-2 text-sm">
            <span className="font-medium text-foreground">{totalItems}</span> message{totalItems !== 1 ? 's' : ''} au total
          </div>
        </div>
        
        <div className="bg-card border rounded-lg p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <form onSubmit={handleSearch} className="flex-1 max-w-2xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par rÃ©fÃ©rence, destinataire, message..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full bg-background"
                />
              </div>
            </form>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDeleteAllClick}
              disabled={isLoading || isDeleting || allMessages.length === 0}
              className="whitespace-nowrap"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Tout supprimer
            </Button>
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <span className="hidden sm:inline">TriÃ© par :</span>
              <span className="font-medium text-foreground">Date rÃ©cente</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Contenu avec dÃ©filement */}
      <div className="flex-1 min-h-0">
        <Tabs 
          defaultValue="unides" 
          onValueChange={(value) => {
            setActiveTab(value as MessageType);
            setPage(1);
          }}
          className="h-full flex flex-col"
        >
        <TabsList className="h-auto p-1 bg-muted/50 border rounded-lg w-full sm:w-auto">
          <TabsTrigger 
            value="unides" 
            className="px-4 py-2 text-sm font-medium rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Messages unitaires
          </TabsTrigger>
          <TabsTrigger 
            value="muldes" 
            className="px-4 py-2 text-sm font-medium rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
          >
            <Users className="h-4 w-4 mr-2" />
            Messages groupÃ©s
          </TabsTrigger>
          <TabsTrigger 
            value="muldesp" 
            className="px-4 py-2 text-sm font-medium rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
          >
            <Clock className="h-4 w-4 mr-2" />
            Programmes
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <Card>
            <CardHeader className="border-b">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-xl">
                    {activeTab === 'unides' && 'Messages unitaires'}
                    {activeTab === 'muldes' && 'Messages groupÃ©s'}
                    {activeTab === 'muldesp' && 'Messages programmÃ©s'}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {activeTab === 'unides' && 'Historique des messages envoyÃ©s individuellement'}
                    {activeTab === 'muldes' && 'Historique des messages envoyÃ©s en groupe'}
                    {activeTab === 'muldesp' && 'Historique des messages programmÃ©s'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8 gap-1">
                    <FileDown className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                      Exporter
                    </span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : error ? (
                <div className="text-red-500 text-center py-8">{error}</div>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="font-semibold text-foreground">RÃ©fÃ©rence</TableHead>
                          <TableHead className="font-semibold text-foreground">Date</TableHead>
                          <TableHead className="font-semibold text-foreground">Ã‰metteur</TableHead>
                          <TableHead className="font-semibold text-foreground">Destinataire(s)</TableHead>
                          <TableHead className="font-semibold text-foreground">Message</TableHead>
                          <TableHead className="font-semibold text-foreground text-right">Statut</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayedMessages.length > 0 ? (
                          displayedMessages.map((message) => (
                            <TableRow key={message.ref} className="group hover:bg-muted/50 transition-colors">
                              <TableCell className="font-medium">
                                <div className="font-mono text-sm">{message.ref}</div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium">
                                    {format(new Date(message.createdAt), 'dd MMM yyyy', { locale: fr })}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(message.createdAt), 'HH:mm', { locale: fr })}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">{message.emetteur}</div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <div className="text-sm">
                                    {message.Destinataires?.[0]}
                                    {message.Destinataires && message.Destinataires.length > 1 && (
                                      <>
                                        {' '}
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button
                                                variant="link"
                                                size="sm"
                                                className="h-auto p-0 text-xs text-muted-foreground hover:text-primary cursor-pointer transition-all no-underline hover:no-underline"
                                                onClick={() => handleShowAllRecipients(message.Destinataires || [])}
                                              >
                                                +{message.Destinataires.length - 1}
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom" className="text-xs">
                                              <div className="flex items-center gap-1">
                                                <Info className="h-3 w-3 mr-1" />
                                                Voir les {message.Destinataires.length} destinataires
                                              </div>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                {getStatusBadge(message.statut)}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteClick(message.ref)}
                                  disabled={isDeleting}
                                  className="h-8 w-8"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center">
                              <div className="flex flex-col items-center justify-center py-6">
                                <Inbox className="h-8 w-8 text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">
                                  {filteredMessages.length === 0 
                                    ? 'Aucun message ne correspond Ã  votre recherche' 
                                    : 'Aucun message trouvÃ©'}
                                </p>
                                {filteredMessages.length === 0 && searchQuery && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="mt-2"
                                    onClick={() => setSearchQuery('')}
                                  >
                                    RÃ©initialiser la recherche
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {totalItems > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-4 border-t">
                      <div className="text-sm text-muted-foreground">
                        Affichage de <span className="font-medium text-foreground">{(page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalItems)}</span> sur{' '}
                        <span className="font-medium text-foreground">{totalItems}</span> message{totalItems !== 1 ? 's' : ''}
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(1)}
                          disabled={page === 1}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronsLeft className="h-4 w-4" />
                          <span className="sr-only">PremiÃ¨re page</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(Math.max(1, page - 1))}
                          disabled={page === 1}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          <span className="sr-only">Page prÃ©cÃ©dente</span>
                        </Button>
                        <div className="flex items-center justify-center px-4 text-sm w-24">
                          Page {page}/{totalPages}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(Math.min(totalPages, page + 1))}
                          disabled={page >= totalPages}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronRight className="h-4 w-4" />
                          <span className="sr-only">Page suivante</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(totalPages)}
                          disabled={page >= totalPages}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronsRight className="h-4 w-4" />
                          <span className="sr-only">DerniÃ¨re page</span>
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>

      {/* BoÃ®te de dialogue de suppression d'un message */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le message</DialogTitle>
            <DialogDescription>
              ÃŠtes-vous sÃ»r de vouloir supprimer ce message ? Cette action est irrÃ©versible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Annuler
            </Button>
            <Button 
              variant="destructive"
              onClick={confirmDelete} 
              disabled={isDeleting}
            >
              {isDeleting ? 'Suppression...' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BoÃ®te de dialogue de suppression de tous les messages */}
      <Dialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer tous les messages</DialogTitle>
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <div>
                <p>ÃŠtes-vous certain de vouloir supprimer tous les messages ?</p>
                <p className="font-medium mt-2">Cette action est irrÃ©versible et supprimera dÃ©finitivement tous vos messages.</p>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button 
              variant="outline" 
              onClick={() => setDeleteAllDialogOpen(false)}
              disabled={isDeleting}
            >
              Annuler
            </Button>
            <Button 
              variant="destructive"
              onClick={confirmDeleteAll} 
              disabled={isDeleting}
            >
              {isDeleting ? 'Suppression...' : 'Tout supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BoÃ®te de dialogue pour afficher tous les destinataires */}
      <Dialog open={showAllRecipients} onOpenChange={setShowAllRecipients}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Liste complÃ¨te des destinataires</DialogTitle>
            <DialogDescription>
              {currentRecipients.length} destinataire{currentRecipients.length > 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              {currentRecipients.map((recipient, index) => (
                <div key={index} className="p-2 rounded-md bg-muted/50 text-sm break-all">
                  {recipient}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowAllRecipients(false)}
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

