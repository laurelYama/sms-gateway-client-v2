'use client';

import { useState, useEffect, useMemo } from 'react';
import { getClientId } from '@/lib/utils/clientUtils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, MessageSquare, Check, X, Clock, AlertTriangle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { fetchTickets, createTicket, type Ticket } from '@/lib/api/tickets';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [formData, setFormData] = useState({
    titre: '',
    description: ''
  });
  
  // Filtres
  const [dateFilter, setDateFilter] = useState<{
    from?: Date;
    to?: Date;
  }>({});
  
  const [statusFilter, setStatusFilter] = useState<string>('TOUS');
  
  // Appliquer les filtres et le tri
  const filteredTickets = useMemo(() => {
    return [...tickets]
      .filter(ticket => {
        const ticketDate = new Date(ticket.createdAt);
        
        if (dateFilter.from && ticketDate < dateFilter.from) {
          return false;
        }
        
        if (dateFilter.to) {
          // Ajouter un jour à la date de fin pour inclure toute la journée
          const toDate = new Date(dateFilter.to);
          toDate.setDate(toDate.getDate() + 1);
          if (ticketDate >= toDate) {
            return false;
          }
        }
        
        // Filtre par statut
        if (statusFilter !== 'TOUS' && ticket.statut !== statusFilter) {
          return false;
        }
        
        return true;
      })
      // Trier par date de création (du plus récent au plus ancien)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [tickets, dateFilter, statusFilter]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      
      // Récupération de l'ID client de manière sécurisée
      const clientId = getClientId();
      if (!clientId) {
        throw new Error('Impossible de récupérer l\'ID client. Veuillez vous reconnecter.');
      }
      
      const data = await fetchTickets(clientId);
      setTickets(data);
    } catch (error) {
      console.error('Erreur lors du chargement des tickets:', error);
      const errorMessage = error instanceof Error ? error.message : 'Une erreur inconnue est survenue';
      toast({
        title: 'Erreur',
        description: `Impossible de charger les tickets: ${errorMessage}`,
        variant: 'destructive',
      });
      
      // Rediriger vers la page de connexion en cas d'erreur d'authentification
      if (error instanceof Error && error.message.includes('401')) {
        window.location.href = '/login';
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setCreating(true);
      
      // Récupération sécurisée de l'utilisateur depuis les cookies
      const userCookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('user='))
        ?.split('=')[1];
      
      let user = {};
      if (userCookie) {
        try {
          user = JSON.parse(decodeURIComponent(userCookie));
        } catch (error) {
          console.error('Erreur lors du parsing des données utilisateur:', error);
        }
      }
      
      await createTicket({
        titre: formData.titre,
        description: formData.description,
        clientId: user?.id || '700001',
        emailClient: user?.email || ''
      });
      
      toast({
        title: 'Succès',
        description: 'Le ticket a été créé avec succès',
      });
      
      setFormData({ titre: '', description: '' });
      setShowCreateDialog(false);
      loadTickets();
    } catch (error) {
      console.error('Erreur lors de la création du ticket:', error);
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OUVERT':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <Clock className="h-3 w-3 mr-1" /> Ouvert
        </span>;
      case 'EN_COURS':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <AlertTriangle className="h-3 w-3 mr-1" /> En cours
        </span>;
      case 'FERME':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <Check className="h-3 w-3 mr-1" /> Fermé
        </span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          {status}
        </span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tickets de support</h1>
          <p className="text-muted-foreground">Gérez vos demandes d'assistance</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Nouveau ticket
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreateTicket}>
              <DialogHeader>
                <DialogTitle>Nouveau ticket de support</DialogTitle>
                <DialogDescription>
                  Remplissez les détails de votre demande. Notre équipe vous répondra dans les plus brefs délais.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="titre" className="text-sm font-medium leading-none">
                    Sujet <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="titre"
                    placeholder="Décrivez brièvement votre problème"
                    value={formData.titre}
                    onChange={(e) => setFormData({...formData, titre: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="description" className="text-sm font-medium leading-none">
                    Description détaillée <span className="text-destructive">*</span>
                  </label>
                  <Textarea
                    id="description"
                    placeholder="Décrivez votre problème en détail..."
                    rows={5}
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                  disabled={creating}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Création...
                    </>
                  ) : (
                    'Créer le ticket'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Mes tickets</CardTitle>
            <CardDescription>Liste de vos demandes de support</CardDescription>
          </div>
          <div className="flex gap-2">
            <Select 
              value={statusFilter} 
              onValueChange={setStatusFilter}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TOUS">Tous les statuts</SelectItem>
                <SelectItem value="OUVERT">Ouvert</SelectItem>
                <SelectItem value="EN_COURS">En cours</SelectItem>
                <SelectItem value="FERME">Fermé</SelectItem>
              </SelectContent>
            </Select>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFilter.from ? (
                    dateFilter.to ? (
                      <>
                        {format(dateFilter.from, 'dd MMM yyyy')} - {format(dateFilter.to, 'dd MMM yyyy')}
                      </>
                    ) : (
                      format(dateFilter.from, 'dd MMM yyyy')
                    )
                  ) : 'Filtrer par date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateFilter.from}
                  selected={{
                    from: dateFilter.from,
                    to: dateFilter.to
                  }}
                  onSelect={(range) => {
                    setDateFilter({
                      from: range?.from,
                      to: range?.to
                    });
                  }}
                  numberOfMonths={1}
                  className="rounded-md border"
                />
                <div className="flex justify-end gap-2 p-3 border-t">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setDateFilter({})}
                    disabled={!dateFilter.from && !dateFilter.to}
                  >
                    Réinitialiser
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold">
                {dateFilter.from || dateFilter.to || statusFilter !== 'TOUS' ? 'Aucun ticket trouvé' : 'Aucun ticket'}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {dateFilter.from || dateFilter.to || statusFilter !== 'TOUS'
                  ? 'Aucun ticket ne correspond à vos critères de filtre.'
                  : 'Vous n\'avez pas encore créé de ticket de support.'
                }
              </p>
              <div className="mt-6">
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau ticket
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Sujet</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date de création</TableHead>
                    <TableHead>Dernière mise à jour</TableHead>
                    <TableHead>Réponse</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-mono text-sm">{ticket.id.substring(0, 8)}</TableCell>
                      <TableCell className="font-medium">{ticket.titre}</TableCell>
                      <TableCell>{getStatusBadge(ticket.statut)}</TableCell>
                      <TableCell>
                        {format(new Date(ticket.createdAt), 'PPpp', { locale: fr })}
                      </TableCell>
                      <TableCell>
                        {format(new Date(ticket.updatedAt), 'PPpp', { locale: fr })}
                      </TableCell>
                      <TableCell>
                        {ticket.reponseAdmin ? (
                          <Button 
                            variant="link" 
                            className="p-0 h-auto text-green-600"
                            onClick={() => setSelectedTicket(ticket)}
                          >
                            Voir la réponse
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">En attente</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogue de réponse de l'admin */}
      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Réponse du support</DialogTitle>
            <DialogDescription>
              Réponse à votre ticket du {selectedTicket && format(new Date(selectedTicket.createdAt), 'PP', { locale: fr })}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 flex-1 overflow-hidden">
            <div className="space-y-1">
              <h4 className="text-sm font-medium">Votre demande :</h4>
              <p className="text-sm text-muted-foreground">{selectedTicket?.titre}</p>
              <div className="bg-muted/50 p-4 rounded-md mt-2">
                <p className="text-sm whitespace-pre-line">{selectedTicket?.description}</p>
              </div>
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-medium">Réponse du support :</h4>
              <div className="bg-primary/5 p-4 rounded-md">
                <p className="text-sm whitespace-pre-line">{selectedTicket?.reponseAdmin}</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setSelectedTicket(null)}
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
