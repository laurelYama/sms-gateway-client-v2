'use client';

import { useState, useEffect, useMemo } from 'react';
import { getClientId } from '@/lib/utils/clientUtils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { es } from 'date-fns/locale';
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
          <h1 className="text-3xl font-bold">Tickets de soporte</h1>
          <p className="text-muted-foreground">Gestione sus solicitudes de asistencia</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Nuevo ticket
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreateTicket}>
              <DialogHeader>
                <DialogTitle>Nuevo ticket de soporte</DialogTitle>
                <DialogDescription>
                  Complete los detalles de su solicitud. Nuestro equipo le responderá lo antes posible.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="titre" className="text-sm font-medium leading-none">
                    Asunto <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="titre"
                    placeholder="Describa brevemente su problema"
                    value={formData.titre}
                    onChange={(e) => setFormData({...formData, titre: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="description" className="text-sm font-medium leading-none">
                    Descripción detallada <span className="text-destructive">*</span>
                  </label>
                  <Textarea
                    id="description"
                    placeholder="Describa su problema en detalle..."
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
                  Cancelar
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    'Crear ticket'
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
            <CardTitle>Mis tickets</CardTitle>
            <CardDescription>Lista de sus solicitudes de soporte</CardDescription>
          </div>
          <div className="flex gap-2">
            <Select 
              value={statusFilter} 
              onValueChange={setStatusFilter}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TOUS">Todos los estados</SelectItem>
                <SelectItem value="OUVERT">Abierto</SelectItem>
                <SelectItem value="EN_COURS">En curso</SelectItem>
                <SelectItem value="FERME">Cerrado</SelectItem>
              </SelectContent>
            </Select>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFilter.from ? (
                    dateFilter.to ? (
                      <>
                        {format(dateFilter.from, 'dd MMM yyyy', { locale: es })} - {format(dateFilter.to, 'dd MMM yyyy', { locale: es })}
                      </>
                    ) : (
                      format(dateFilter.from, 'dd MMM yyyy', { locale: es })
                    )
                  ) : 'Filtrar por fecha'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="p-3">
                  <div className="flex justify-between mb-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const today = new Date();
                        setDateFilter({
                          from: today,
                          to: today
                        });
                      }}
                    >
                      Hoy
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDateFilter({ from: undefined, to: undefined })}
                    >
                      Reiniciar
                    </Button>
                  </div>
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
                    locale={es}
                    numberOfMonths={1}
                    className="rounded-md border-0"
                    classNames={{
                      nav_button: 'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
                      nav_button_previous: 'absolute left-1',
                      nav_button_next: 'absolute right-1',
                      head_cell: 'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]',
                      cell: 'h-9 w-9 p-0 text-center text-sm',
                      day: 'h-9 w-9 p-0 font-normal aria-selected:opacity-100',
                      day_selected: 'bg-primary text-primary-foreground hover:bg-primary/90',
                      day_today: 'bg-accent text-accent-foreground',
                      day_range_start: 'day-range-start',
                      day_range_end: 'day-range-end',
                    }}
                  />
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
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold">
                {dateFilter.from || dateFilter.to || statusFilter !== 'TOUS' ? 'No se encontraron tickets' : 'No hay tickets'}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {dateFilter.from || dateFilter.to || statusFilter !== 'TOUS'
                  ? 'Ningún ticket coincide con sus criterios de filtrado.'
                  : 'Aún no ha creado ningún ticket de soporte.'
                }
              </p>
              <div className="mt-6">
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo ticket
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Asunto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha de creación</TableHead>
                    <TableHead>Última actualización</TableHead>
                    <TableHead>Respuesta</TableHead>
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
                            Ver respuesta
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">Pendiente</span>
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
            <DialogTitle>Respuesta del soporte</DialogTitle>
            <DialogDescription>
              Respuesta a su ticket del {selectedTicket && format(new Date(selectedTicket.createdAt), 'PP', { locale: es })}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 flex-1 overflow-hidden">
            <div className="space-y-1">
              <h4 className="text-sm font-medium">Su solicitud:</h4>
              <p className="text-sm text-muted-foreground">{selectedTicket?.titre}</p>
              <div className="bg-muted/50 p-4 rounded-md mt-2">
                <p className="text-sm whitespace-pre-line">{selectedTicket?.description}</p>
              </div>
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-medium">Respuesta del soporte:</h4>
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
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
