'use client';

import { useState, useEffect } from 'react';
import { getTokenFromCookies, getUserFromCookies } from "@/lib/auth";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  Loader2,
  Users,
  FileDown,
  Info
} from 'lucide-react';

type MessageType = 'unides' | 'muldes' | 'muldesp';

interface Message {
  ref: string;
  type: string;
  destinataire?: string;
  destinataires?: string[];
  Destinataires?: string[];
  corps: string;
  emetteur: string;
  statut: string;
  createdAt: string;
  dateDebutEnvoi?: string;
  dateFinEnvoi?: string;
  nbParJour?: number;
  intervalleMinutes?: number;
  clientId?: string;
}

export default function HistoriquePage() {
  const [activeTab, setActiveTab] = useState<MessageType>('unides');
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);
  const [displayedMessages, setDisplayedMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // États pour la suppression
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [showAllRecipients, setShowAllRecipients] = useState(false);
  const [currentRecipients, setCurrentRecipients] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Fonction pour supprimer un message
  const deleteMessage = async (ref: string) => {
    const token = await getTokenFromCookies();
    const user = await getUserFromCookies();
    const clientId = user?.id; // Changé de clientId à id

    if (!clientId) {
      throw new Error('ID client non trouvé');
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
      console.error('Détails de l\'erreur:', errorData);
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
      throw new Error('ID client non trouvé');
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
      console.error('Détails de l\'erreur:', errorData);
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
      toast.success('Message supprimé avec succès');
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
      toast.success('Tous les messages ont été supprimés avec succès');
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

  // Afficher tous les destinataires dans une boîte de dialogue
  const handleShowAllRecipients = (message: any) => {
    // Essayer différentes propriétés possibles pour les destinataires
    const recipients = message.destinataires || message.Destinataires || message.recipients || [];
    setCurrentRecipients(recipients);
    setShowAllRecipients(true);
  };

  // Charger les messages
  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      console.log(`Chargement des messages de type: ${activeTab}`);
      
      // Récupérer les données depuis l'API
      const data = await fetchMessages(activeTab, 1, 1000);
      console.log('Données reçues de l\'API:', data);
      
      // Vérifier si les données sont valides
      if (!data || !Array.isArray(data.data)) {
        console.error('Format de données invalide:', data);
        setError('Format de données invalide reçu du serveur');
        setAllMessages([]);
        return;
      }
      
      // Mettre à jour les états avec les données
      let messages = data.data || [];
      
      // Pour les messages groupés, formater les données pour une meilleure cohérence
      if (activeTab === 'muldes') {
        messages = messages.map(msg => ({
          ...msg,
          destinataires: msg.destinataires || msg.Destinataires || [],
          type: 'MULDES' // S'assurer que le type est cohérent
        }));
      }
      
      setAllMessages(messages);
      
      if (messages.length > 0) {
        console.log(`Reçu ${messages.length} messages`);
        console.log('Exemple de message:', messages[0]);
        
        // Appliquer les filtres initiaux
        applyFilters(messages);
      } else {
        console.log('Aucun message trouvé');
        setFilteredMessages([]);
        setDisplayedMessages([]);
        setTotalItems(0);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('Erreur fetchData:', errorMessage, err);
      setError(`Erreur lors du chargement des messages: ${errorMessage}`);
      
      // Réinitialiser les états en cas d'erreur
      setAllMessages([]);
      setFilteredMessages([]);
      setDisplayedMessages([]);
      setTotalItems(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Appliquer les filtres, le tri par date et la pagination
  const applyFilters = (messages: Message[]) => {
    console.log('applyFilters called with messages:', messages);
    
    if (!messages || messages.length === 0) {
      setFilteredMessages([]);
      setDisplayedMessages([]);
      setTotalItems(0);
      return;
    }
    
    // Créer une copie des messages
    let filtered = [...messages];
    
    // Trier les messages par date (du plus récent au plus ancien)
    filtered = filtered.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Filtrer par statut si un filtre est défini
    if (statusFilter) {
      filtered = filtered.filter(message => message.statut === statusFilter);
    }

    // Filtrer par recherche si une requête est définie
    if (searchQuery) {
      const query = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(message => {
        // Vérifier dans le corps du message
        if (message.corps && message.corps.toLowerCase().includes(query)) return true;
        
        // Vérifier dans l'émetteur
        if (message.emetteur && message.emetteur.toLowerCase().includes(query)) return true;
        
        // Vérifier dans le destinataire unique
        if (message.destinataire && message.destinataire.toLowerCase().includes(query)) return true;
        
        // Vérifier dans les destinataires multiples (propriété destinataires)
        if (message.destinataires && message.destinataires.some(d => 
          d && d.toLowerCase().includes(query)
        )) return true;
        
        // Vérifier dans les destinataires multiples (propriété Destinataires)
        if (message.Destinataires && message.Destinataires.some(d => 
          d && d.toLowerCase().includes(query)
        )) return true;
        
        // Vérifier dans la référence
        if (message.ref && message.ref.toLowerCase().includes(query)) return true;
        
        return false;
      });
    }

    console.log('Messages after filtering:', filtered);
    
    // Mettre à jour le nombre total d'éléments filtrés
    setTotalItems(filtered.length);
    
    // Appliquer la pagination
    const startIndex = (page - 1) * pageSize;
    const paginatedMessages = filtered.slice(startIndex, startIndex + pageSize);
    
    console.log('Paginated messages:', paginatedMessages);
    
    // Mettre à jour les états
    setFilteredMessages(filtered);
    setDisplayedMessages(paginatedMessages);
  };

  // Mettre à jour les messages affichés quand les données, la recherche, le statut ou la page changent
  useEffect(() => {
    if (allMessages.length > 0) {
      applyFilters(allMessages);
    }
  }, [allMessages, searchQuery, statusFilter, page, pageSize]);
  
  // Effet pour gérer le rendu côté client uniquement
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Charger les données au montage du composant et quand l'onglet change
  useEffect(() => {
    setPage(1);
    setSearchQuery('');
    setStatusFilter('');
    fetchData();
  }, [activeTab]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // La recherche est gérée par l'effet sur searchQuery
    setPage(1); // Réinitialiser à la première page lors d'une nouvelle recherche
  };

  // Fonction pour changer le nombre d'éléments par page
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value));
    setPage(1); // Réinitialiser à la première page lors du changement de taille de page
  };
  
  // Fonction pour gérer le changement d'onglet avec réinitialisation de la page
  const handleTabChange = (value: string) => {
    setActiveTab(value as MessageType);
    setPage(1);
  };

  const totalPages = Math.ceil(totalItems / pageSize);

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'PPpp', { locale: fr });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, string> = {
      'EN_ATTENTE': 'En attente',
      'ENVOYE': 'Envoyé',
      'ECHEC': 'Échec',
      'ANNULE': 'Annulé',
      'EN_COURS': 'En cours',
      'TERMINE': 'Terminé',
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

  // Log pour déboguer la structure des messages
  useEffect(() => {
    if (displayedMessages.length > 0) {
      console.log('Message example:', displayedMessages[0]);
      console.log('Destinataires:', displayedMessages[0].Destinataires);
      console.log('destinataire:', displayedMessages[0].destinataire);
      console.log('recipients:', displayedMessages[0].recipients);
    }
  }, [displayedMessages]);

  return (
    <div className="flex flex-col h-full">
      <div className="space-y-4">
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
                  placeholder="Rechercher par référence, destinataire, message..."
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
              <Trash2 className="h-4 w-4" />
              Tout supprimer
            </Button>
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <span className="hidden sm:inline">Trié par :</span>
              <span className="font-medium text-foreground">Date récente</span>
            </div>
          </div>
        </div>
      </div>

      <Tabs
        defaultValue="unides" 
        className="w-full" 
        onValueChange={handleTabChange}
        value={activeTab}
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
            Messages groupés
          </TabsTrigger>
          <TabsTrigger
            value="muldesp"
            className="px-4 py-2 text-sm font-medium rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
          >
            <Clock className="h-4 w-4 mr-2" />
            Programmes
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6 flex-1 flex flex-col">
          <Card className="flex-1 flex flex-col">
            <CardHeader className="border-b">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-xl">
                    {activeTab === 'unides' && 'Messages unitaires'}
                    {activeTab === 'muldes' && 'Messages groupés'}
                    {activeTab === 'muldesp' && 'Messages programmés'}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {activeTab === 'unides' && 'Historique des messages envoyés individuellement'}
                    {activeTab === 'muldes' && 'Historique des messages envoyés en groupe'}
                    {activeTab === 'muldesp' && 'Historique des messages programmés'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-8 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">Tous les statuts</option>
                    <option value="EN_ATTENTE">En attente</option>
                    <option value="EN_COURS">En cours</option>
                    <option value="TERMINE">Terminé</option>
                    <option value="ERREUR">Erreur</option>
                    <option value="ANNULE">Annulé</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : error ? (
                <div className="text-red-500 text-center py-8">{error}</div>
              ) : (
                <div className="flex-1 overflow-hidden flex flex-col">
                  <div className="rounded-md border flex-1 overflow-hidden">
                    <div className="overflow-auto h-full">
                      <Table className="min-w-full">
                        <TableHeader className="bg-muted/50 sticky top-0">
                          <TableRow className="hover:bg-muted/60 transition-colors">
                            <TableHead className="font-semibold text-foreground">Référence</TableHead>
                            <TableHead className="font-semibold text-foreground">Message</TableHead>
                            <TableHead className="font-semibold text-foreground">Destinataire(s)</TableHead>
                            <TableHead className="font-semibold text-foreground">Émetteur</TableHead>
                            <TableHead className="font-semibold text-foreground">Statut</TableHead>
                            <TableHead className="font-semibold text-foreground">Date</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {displayedMessages.length > 0 ? (
                            displayedMessages.map((message) => (
                              <TableRow 
                                key={message.ref} 
                                className="group hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors duration-200 border-b border-border/50 last:border-0"
                              >
                                <TableCell className="font-medium p-3">
                                  <div className="flex items-center gap-2">
                                    {message.type === 'MULDES' || message.type === 'MULDESP' ? (
                                      <Users className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                    )}
                                    {message.ref}
                                  </div>
                                </TableCell>
                                <TableCell className="whitespace-normal p-3">
                                  <div className="space-y-1">
                                    <div>{message.corps}</div>
                                    {(message.type === 'MULDESP' || message.type === 'MULDES') && (
                                      <div className="text-xs text-muted-foreground">
                                        {message.dateDebutEnvoi && (
                                          <div>Début: {format(new Date(message.dateDebutEnvoi), 'PPpp', { locale: fr })}</div>
                                        )}
                                        {message.dateFinEnvoi && (
                                          <div>Fin: {format(new Date(message.dateFinEnvoi), 'PPpp', { locale: fr })}</div>
                                        )}
                                        {message.nbParJour && (
                                          <div>{message.nbParJour} envoi(s) par jour</div>
                                        )}
                                        {message.intervalleMinutes !== undefined && message.intervalleMinutes > 0 && (
                                          <div>Intervalle: {message.intervalleMinutes} min</div>
                                        )}
                                        {(message.destinataires || message.Destinataires) && (
                                          <div className="mt-1">
                                            <Button 
                                              variant="ghost" 
                                              size="sm" 
                                              className="h-6 text-xs p-0 text-muted-foreground hover:text-foreground"
                                              onClick={() => handleShowAllRecipients(message)}
                                            >
                                              Voir les {message.destinataires?.length || message.Destinataires?.length} destinataires
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {message.type === 'MULDES' || message.type === 'MULDESP' ? (
                                    <Badge variant="secondary" className="font-normal">
                                      {(message.destinataires || message.Destinataires || []).length} destinataires
                                    </Badge>
                                  ) : (
                                    <span className="font-medium">{message.destinataire}</span>
                                  )}
                                </TableCell>
                                <TableCell className="p-3">{message.emetteur}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    {message.statut === 'ENVOYE' && (
                                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    )}
                                    {message.statut === 'EN_ATTENTE' && (
                                      <Clock className="h-4 w-4 text-yellow-500" />
                                    )}
                                    {message.statut === 'ERREUR' && (
                                      <XCircle className="h-4 w-4 text-red-500" />
                                    )}
                                    {message.statut}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col">
                                    <span>{format(new Date(message.createdAt), 'PPpp', { locale: fr })}</span>
                                    {message.type === 'MULDESP' && message.updatedAt && (
                                      <span className="text-xs text-muted-foreground">
                                        Modifié: {format(new Date(message.updatedAt), 'PPpp', { locale: fr })}
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="p-3 text-right">
                                  <div className="flex justify-end gap-1">
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <Info className="h-4 w-4" />
                                            <span className="sr-only">Détails</span>
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs">
                                          <div className="space-y-2">
                                            <p className="font-medium">Détails du message</p>
                                            <div className="space-y-1">
                                              <p><span className="font-medium">Référence :</span> {message.ref}</p>
                                              <p><span className="font-medium">Type :</span> {message.type}</p>
                                              <p><span className="font-medium">Statut :</span> {message.statut}</p>
                                              {message.type === 'MULDESP' && (
                                                <div className="space-y-1 mt-2">
                                                  <p className="font-medium">Programmation :</p>
                                                  <ul className="list-disc pl-4 space-y-1">
                                                    {message.dateDebutEnvoi && (
                                                      <li>Début: {format(new Date(message.dateDebutEnvoi), 'PPpp', { locale: fr })}</li>
                                                    )}
                                                    {message.dateFinEnvoi && (
                                                      <li>Fin: {format(new Date(message.dateFinEnvoi), 'PPpp', { locale: fr })}</li>
                                                    )}
                                                    {message.nbParJour && (
                                                      <li>{message.nbParJour} envoi(s) par jour</li>
                                                    )}
                                                    {message.intervalleMinutes !== undefined && message.intervalleMinutes > 0 && (
                                                      <li>Intervalle: {message.intervalleMinutes} min</li>
                                                    )}
                                                  </ul>
                                                </div>
                                              )}
                                            </div>
                                            <div className="mt-2">
                                              <p className="font-medium">Destinataires :</p>
                                              <ul className="max-h-40 overflow-y-auto mt-1 border rounded-md p-2 space-y-1">
                                                {(message.destinataires || message.Destinataires || message.recipients || []).map((recipient: string, index: number) => (
                                                  <li key={index} className="text-sm py-1 border-b last:border-0 last:pb-0 first:pt-0">
                                                    {recipient}
                                                  </li>
                                                ))}
                                              </ul>
                                            </div>
                                          </div>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                                            onClick={() => handleDeleteClick(message.ref)}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                            <span className="sr-only">Supprimer</span>
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Supprimer ce message</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={7} className="p-4 text-center">
                                Aucun message trouvé
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Pagination */}
                  {isClient && totalItems > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t bg-muted/20">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Afficher</span>
                        <select
                          value={pageSize}
                          onChange={handlePageSizeChange}
                          className="h-8 w-16 rounded-md border border-input bg-background px-2 py-1 text-sm"
                        >
                          {[5, 10, 20, 50, 100].map(size => (
                            <option key={size} value={size}>
                              {size}
                            </option>
                          ))}
                        </select>
                        <span>éléments par page</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {totalItems > 0 ? (page - 1) * pageSize + 1 : 0} -{' '}
                          {Math.min(page * pageSize, totalItems)} sur {totalItems}
                        </span>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(1)}
                          disabled={page === 1}
                          className="h-8 w-8 p-0"
                        >
                          <span className="sr-only">Première page</span>
                          <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className="h-8 w-8 p-0"
                        >
                          <span className="sr-only">Page précédente</span>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                          disabled={page >= totalPages}
                          className="h-8 w-8 p-0"
                        >
                          <span className="sr-only">Page suivante</span>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(totalPages)}
                          disabled={page >= totalPages}
                          className="h-8 w-8 p-0"
                        >
                          <span className="sr-only">Dernière page</span>
                          <ChevronsRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Boîte de dialogue de suppression d'un message */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le message</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer ce message ? Cette action est irréversible.
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

      {/* Boîte de dialogue de suppression de tous les messages */}
      <Dialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer tous les messages</DialogTitle>
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <div>
                <p>Êtes-vous certain de vouloir supprimer tous les messages ?</p>
                <p className="font-medium mt-2">Cette action est irréversible et supprimera définitivement tous vos messages.</p>
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

      {/* Boîte de dialogue pour afficher tous les destinataires */}
      <Dialog open={showAllRecipients} onOpenChange={setShowAllRecipients}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Liste complète des destinataires</DialogTitle>
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
