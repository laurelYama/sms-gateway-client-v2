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

import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MessageSquare,
  Search,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  Users,
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
  updatedAt?: string;
}

export default function HistoriquePage() {
  const [activeTab, setActiveTab] = useState<MessageType>('unides');
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);
  const [displayedMessages, setDisplayedMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
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

  /** ======================= 🔹 FONCTIONS API ======================= **/
  const deleteMessage = async (ref: string) => {
    const token = await getTokenFromCookies();
    const user = await getUserFromCookies();
    const clientId = user?.id;
    const url = `https://api-smsgateway.solutech-one.com/api/V1/sms/client/${clientId}/ref/${ref}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Erreur de suppression');
  };

  const deleteAllMessages = async () => {
    const token = await getTokenFromCookies();
    const user = await getUserFromCookies();
    const clientId = user?.id;
    const res = await fetch(`https://api-smsgateway.solutech-one.com/api/V1/sms/client/${clientId}/all`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Erreur lors de la suppression');
  };

  /** ======================= 🔹 FETCH + FILTRES ======================= **/
  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await fetchMessages(activeTab, 1, 1000);
      const messages = Array.isArray(data.data) ? data.data : [];
      setAllMessages(messages);
      applyFilters(messages);
    } catch (e: any) {
      setError(e.message || 'Erreur de chargement');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = (messages: Message[]) => {
    let filtered = [...messages];
    if (statusFilter) filtered = filtered.filter(m => m.statut === statusFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
          m.corps?.toLowerCase().includes(q) ||
          m.emetteur?.toLowerCase().includes(q) ||
          m.destinataire?.toLowerCase().includes(q) ||
          m.ref?.toLowerCase().includes(q)
      );
    }
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setFilteredMessages(filtered);
    setTotalItems(filtered.length);
    const start = (page - 1) * pageSize;
    setDisplayedMessages(filtered.slice(start, start + pageSize));
  };

  useEffect(() => { fetchData(); }, [activeTab]);
  useEffect(() => { if (allMessages.length) applyFilters(allMessages); }, [allMessages, searchQuery, statusFilter, page, pageSize]);
  useEffect(() => { setIsClient(true); }, []);

  /** ======================= 🔹 ACTIONS ======================= **/
  const handleDeleteClick = (ref: string) => {
    setMessageToDelete(ref);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!messageToDelete) return;
    try {
      setIsDeleting(true);
      await deleteMessage(messageToDelete);
      toast.success('Message supprimé avec succès');
      fetchData();
    } catch {
      toast.error('Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const confirmDeleteAll = async () => {
    try {
      setIsDeleting(true);
      await deleteAllMessages();
      toast.success('Tous les messages supprimés');
      fetchData();
    } catch {
      toast.error('Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
      setDeleteAllDialogOpen(false);
    }
  };

  const handleShowAllRecipients = (message: Message) => {
    const recipients = message.destinataires || message.Destinataires || [];
    setCurrentRecipients(recipients);
    setShowAllRecipients(true);
  };

  const totalPages = Math.ceil(totalItems / pageSize);

  /** ======================= 🔹 RENDU ======================= **/
  return (
      <div className="flex flex-col h-full">
        {/* === HEADER === */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                Historique des messages
              </h1>
              <p className="text-muted-foreground mt-1">Consultez l’historique complet de vos envois</p>
            </div>
            <div className="bg-muted/50 rounded-lg px-4 py-2 text-sm">
              <span className="font-medium text-foreground">{totalItems}</span> message{totalItems !== 1 ? 's' : ''}
            </div>
          </div>

          <div className="bg-card border rounded-lg p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <form onSubmit={(e) => e.preventDefault()} className="flex-1 max-w-2xl">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                      placeholder="Rechercher par référence, destinataire, message..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-full bg-background"
                  />
                </div>
              </form>
              <Button variant="outline" size="sm" onClick={() => setDeleteAllDialogOpen(true)} disabled={isLoading || isDeleting || !allMessages.length}>
                <Trash2 className="h-4 w-4 mr-2" />
                Tout supprimer
              </Button>
            </div>
          </div>
        </div>

        {/* === TABS === */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as MessageType)} className="flex-1 flex flex-col min-h-0 mt-6">
          <TabsList className="p-1 bg-muted/50 border rounded-lg w-full sm:w-auto">
            <TabsTrigger value="unides">Unitaires</TabsTrigger>
            <TabsTrigger value="muldes">Groupés</TabsTrigger>
            <TabsTrigger value="muldesp">Programmés</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="flex-1 flex flex-col min-h-0 mt-4">
            <Card className="flex-1 flex flex-col">
              <CardHeader className="border-b flex-shrink-0">
                <CardTitle className="text-xl">Liste des messages</CardTitle>
              </CardHeader>

              <CardContent className="p-0 flex-1 flex flex-col min-h-0 overflow-hidden">
                {isLoading ? (
                    <div className="flex justify-center items-center flex-1">
                      <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full" />
                    </div>
                ) : error ? (
                    <div className="text-red-500 text-center py-6">{error}</div>
                ) : (
                    <>
                      {/* === TABLE === */}
                      <div className="flex-1 overflow-y-auto">
                        <Table className="min-w-full border-collapse">
                          <TableHeader className="bg-muted/50 sticky top-0 z-10">
                            <TableRow>
                              <TableHead>Référence</TableHead>
                              <TableHead>Message</TableHead>
                              <TableHead>Destinataire(s)</TableHead>
                              <TableHead>Émetteur</TableHead>
                              <TableHead>Statut</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead></TableHead>
                            </TableRow>
                          </TableHeader>

                          <TableBody>
                            {displayedMessages.length ? (
                                displayedMessages.map((m) => (
                                    <TableRow key={m.ref}>
                                      <TableCell className="font-medium flex items-center gap-2">
                                        {m.type === 'MULDES' ? <Users className="h-4 w-4 text-muted-foreground" /> : <MessageSquare className="h-4 w-4 text-muted-foreground" />}
                                        {m.ref}
                                      </TableCell>
                                      <TableCell className="max-w-[280px] break-words">{m.corps}</TableCell>
                                      <TableCell>
                                        {m.destinataire || (
                                            <Button variant="ghost" size="sm" className="text-xs p-0 hover:text-primary hover:cursor-pointer transition-colors" onClick={() => handleShowAllRecipients(m)}>
                                              Voir les {m.destinataires?.length || m.Destinataires?.length} destinataires
                                            </Button>
                                        )}
                                      </TableCell>
                                      <TableCell>{m.emetteur}</TableCell>
                                      <TableCell>
                                        {m.statut === 'ENVOYE' && <CheckCircle2 className="inline h-4 w-4 text-green-500 mr-1" />}
                                        {m.statut === 'EN_ATTENTE' && <Clock className="inline h-4 w-4 text-yellow-500 mr-1" />}
                                        {m.statut === 'ERREUR' && <XCircle className="inline h-4 w-4 text-red-500 mr-1" />}
                                        {m.statut}
                                      </TableCell>
                                      <TableCell>{format(new Date(m.createdAt), 'Pp', { locale: fr })}</TableCell>
                                      <TableCell className="text-right">
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button variant="ghost" size="icon">
                                                <Info className="h-4 w-4" />
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-md p-4">
                                              <div className="space-y-3">
                                                <div className="text-sm">
                                                  <p className="text-muted-foreground">
                                                    Créé le {format(new Date(m.createdAt), 'Pp', { locale: fr })}
                                                  </p>
                                                </div>

                                                {/* Détails de programmation */}
                                                {(m.type === 'MULDESP' || m.dateDebutEnvoi) && (
                                                  <div className="pt-2">
                                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                                      {m.dateDebutEnvoi && (
                                                        <div className="space-y-1">
                                                          <p className="font-medium">Date de début:</p>
                                                          <p className="text-muted-foreground">
                                                            {format(new Date(m.dateDebutEnvoi), 'P', { locale: fr })}
                                                          </p>
                                                        </div>
                                                      )}
                                                      {m.dateFinEnvoi && (
                                                        <div className="space-y-1">
                                                          <p className="font-medium">Date de fin:</p>
                                                          <p className="text-muted-foreground">
                                                            {format(new Date(m.dateFinEnvoi), 'P', { locale: fr })}
                                                          </p>
                                                        </div>
                                                      )}
                                                      {m.nbParJour !== undefined && (
                                                        <div className="space-y-1">
                                                          <p className="font-medium">Envois par jour:</p>
                                                          <p className="text-muted-foreground">
                                                            {m.nbParJour}
                                                          </p>
                                                        </div>
                                                      )}
                                                      {m.intervalleMinutes !== undefined && (
                                                        <div className="space-y-1">
                                                          <p className="font-medium">Intervalle (min):</p>
                                                          <p className="text-muted-foreground">
                                                            {m.intervalleMinutes}
                                                          </p>
                                                        </div>
                                                      )}
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>

                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(m.ref)} className="text-destructive hover:bg-destructive/10">
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={7} className="text-center py-6">Aucun message trouvé</TableCell></TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>

                      {/* === PAGINATION === */}
                      {isClient && totalItems > 0 && (
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t bg-muted/20">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>Afficher</span>
                              <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="h-8 w-16 border rounded-md bg-background px-2">
                                {[5, 10, 20, 50].map(s => <option key={s}>{s}</option>)}
                              </select>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={page === 1}><ChevronsLeft className="h-4 w-4" /></Button>
                              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></Button>
                              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}><ChevronRight className="h-4 w-4" /></Button>
                              <Button variant="outline" size="sm" onClick={() => setPage(totalPages)} disabled={page >= totalPages}><ChevronsRight className="h-4 w-4" /></Button>
                            </div>
                          </div>
                      )}
                    </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* === Dialogues === */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Supprimer le message</DialogTitle></DialogHeader>
            <DialogDescription>Cette action est irréversible.</DialogDescription>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Annuler</Button>
              <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
                {isDeleting ? 'Suppression...' : 'Supprimer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Supprimer tous les messages</DialogTitle></DialogHeader>
            <DialogDescription>Confirmez la suppression complète de tous vos messages.</DialogDescription>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteAllDialogOpen(false)}>Annuler</Button>
              <Button variant="destructive" onClick={confirmDeleteAll} disabled={isDeleting}>
                {isDeleting ? 'Suppression...' : 'Tout supprimer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showAllRecipients} onOpenChange={setShowAllRecipients}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Liste des destinataires</DialogTitle></DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto pr-2">
              {currentRecipients.map((r, i) => (
                  <div key={i} className="p-2 bg-muted/50 rounded mb-1">{r}</div>
              ))}
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setShowAllRecipients(false)}>Fermer</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
}
