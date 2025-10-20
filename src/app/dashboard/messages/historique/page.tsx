'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getTokenFromCookies } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { fetchMessages } from '@/lib/api/sms';
import { Input } from '@/components/ui/input';
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

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
  const [page, setPage] = useState(1);
  const [pageSize] = useState(5);
  const [totalItems, setTotalItems] = useState(0);

  // Charger les messages
  const fetchData = async () => {
    try {
      setIsLoading(true);
      // Désactiver temporairement la pagination côté client en récupérant toutes les données
      const data = await fetchMessages(activeTab, 1, 1000); // Augmenté la limite pour récupérer plus de données
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
    // Trier les messages par date (du plus récent au plus ancien)
    let filtered = [...messages].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    // Filtrer par recherche
    if (searchQuery.trim()) {
      const searchLower = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(message => {
        // Vérifier chaque champ de manière plus robuste
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
    
    // Mettre à jour le nombre total de pages
    const newTotalPages = Math.ceil(filtered.length / pageSize);
    
    // Ajuster la page actuelle si nécessaire
    const newPage = page > newTotalPages && newTotalPages > 0 ? newTotalPages : page;
    if (newPage !== page) {
      setPage(newPage);
    }
    
    // Appliquer la pagination
    const startIndex = (newPage - 1) * pageSize;
    const paginatedData = filtered.slice(startIndex, startIndex + pageSize);
    setDisplayedMessages(paginatedData);
  };
  
  // Mettre à jour les messages affichés quand les données, la recherche ou la page changent
  useEffect(() => {
    if (allMessages.length > 0) {
      applyFilters(allMessages);
    }
  }, [allMessages, searchQuery, page]);
  
  // Recharger les données quand l'onglet change
  useEffect(() => {
    setPage(1);
    setSearchQuery('');
    fetchData();
  }, [activeTab]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // La recherche est gérée par l'effet sur searchQuery
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
      'ANNULE': 'Annulé'
    };

    const variantMap: Record<string, 'secondary' | 'default' | 'destructive' | 'outline'> = {
      'EN_ATTENTE': 'secondary',
      'ENVOYE': 'default',
      'ECHEC': 'destructive',
      'ANNULE': 'outline'
    };

    return (
      <Badge variant={variantMap[status] || 'outline'}>
        {statusMap[status] || status}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto py-6">
      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Historique des messages</h1>
          <div className="text-sm text-muted-foreground">
            {totalItems} message{totalItems !== 1 ? 's' : ''} au total
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-auto">
            <Input
              placeholder="Rechercher un message..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64"
            />
            <Button type="submit" variant="outline">
              <Search className="h-4 w-4" />
              <span className="ml-2 hidden sm:inline">Rechercher</span>
            </Button>
          </form>
          
          <div className="text-sm text-muted-foreground self-end sm:self-center">
            Affichage des messages les plus récents
          </div>
        </div>
      </div>

      <Tabs defaultValue="unides" onValueChange={(value) => {
        setActiveTab(value as MessageType);
        setPage(1);
      }}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="unides">Messages unitaires</TabsTrigger>
          <TabsTrigger value="muldes">Messages groupés</TabsTrigger>
          <TabsTrigger value="muldesp">Messages programmés</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {activeTab === 'unides' && 'Messages unitaires'}
                {activeTab === 'muldes' && 'Messages groupés'}
                {activeTab === 'muldesp' && 'Messages programmés'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : error ? (
                <div className="text-red-500 text-center py-8">{error}</div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Référence</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Émetteur</TableHead>
                        <TableHead>Destinataire(s)</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedMessages.length > 0 ? (
                        displayedMessages.map((message) => (
                          <TableRow key={message.ref}>
                            <TableCell className="font-medium">{message.ref}</TableCell>
                            <TableCell>{formatDate(message.createdAt)}</TableCell>
                            <TableCell>{message.emetteur}</TableCell>
                            <TableCell>
                              {message.destinataire ? (
                                <div>{message.destinataire}</div>
                              ) : message.Destinataires ? (
                                <div className="space-y-1">
                                  {message.Destinataires.slice(0, 2).map((dest, i) => (
                                    <div key={i} className="text-sm">{dest}</div>
                                  ))}
                                  {message.Destinataires.length > 2 && (
                                    <div className="text-xs text-muted-foreground">
                                      +{message.Destinataires.length - 2} destinataires
                                    </div>
                                  )}
                                </div>
                              ) : null}
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {message.corps}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(message.statut)}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            {filteredMessages.length === 0 ? 'Aucun message ne correspond à votre recherche' : 'Aucun message trouvé'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>

                  {totalItems > 0 && (
                    <div className="flex items-center justify-between px-2 py-4">
                      <div className="text-sm text-muted-foreground">
                        Affichage de {(page - 1) * pageSize + 1} à{' '}
                        {Math.min(page * pageSize, totalItems)} sur {totalItems} messages
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(1)}
                          disabled={page === 1}
                        >
                          <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(Math.max(1, page - 1))}
                          disabled={page === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="px-4 text-sm">
                          Page {page} sur {totalPages}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(Math.min(totalPages, page + 1))}
                          disabled={page >= totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(totalPages)}
                          disabled={page >= totalPages}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
