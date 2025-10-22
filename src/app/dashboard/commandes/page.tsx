'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { purchaseCredits, getCreditHistory } from '@/lib/api/credits';
import { getClientInfo, ClientInfo } from '@/lib/api/client';
import { getUserFromCookies } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

interface CreditRequest {
  id: string;
  requestCode: string;
  clientId: string;
  quantity: number;
  status: string;
  rejectReason: string | null;
  createdAt: string;
  validatedAt: string | null;
  pricePerSmsTtc: number | null;
  estimatedAmountTtc: number | null;
}

export default function CommandesPage() {
  const [quantity, setQuantity] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [history, setHistory] = useState<CreditRequest[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(5);
  const [totalItems, setTotalItems] = useState(0);
  const [currentItems, setCurrentItems] = useState<CreditRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('TOUS');
  const [dateFilter, setDateFilter] = useState<{from?: Date, to?: Date}>({});
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  // Récupérer l'utilisateur connecté
  const user = getUserFromCookies();
  
  // Charger les informations du client
  useEffect(() => {
    const loadClientInfo = async () => {
      if (!user?.id) return;
      
      try {
        const data = await getClientInfo(user.id);
        setClientInfo(data);
      } catch (error) {
        console.error('Erreur lors du chargement des informations du client:', error);
      }
    };
    
    loadClientInfo();
  }, [user?.id]);
  
  // Mettre à jour le coût estimé lorsque la quantité change
  useEffect(() => {
    if (clientInfo && quantity > 0) {
      const cost = clientInfo.coutSmsTtc * quantity;
      setEstimatedCost(cost);
    } else {
      setEstimatedCost(null);
    }
  }, [quantity, clientInfo]);

  // Vérifier s'il y a une commande en attente
  useEffect(() => {
    const pendingRequest = history.some(item => item.status === 'PENDING');
    setHasPendingRequest(pendingRequest);
  }, [history]);

  // Charger l'historique des commandes
  useEffect(() => {
    const loadHistory = async () => {      
      try {
        setIsLoadingHistory(true);
        const data = await getCreditHistory();
        setHistory(data);
        setTotalItems(data.length);
      } catch (error) {
        console.error('Erreur lors du chargement de l\'historique:', error);
        toast.error('Erreur lors du chargement des commandes');
      } finally {
        setIsLoadingHistory(false);
      }
    };

    // Chargement initial
    loadHistory();

    // Mise à jour automatique toutes les 30 secondes
    const intervalId = setInterval(loadHistory, 30000);

    // Nettoyage de l'intervalle lors du démontage du composant
    return () => clearInterval(intervalId);
  }, [toast]);
  
  // Rafraîchir l'historique après une commande
  const refreshHistory = async () => {
    try {
      const data = await getCreditHistory();
      setHistory(data);
      setTotalItems(data.length);
      setPage(1); // Revenir à la première page après une nouvelle commande
    } catch (error) {
      console.error('Erreur lors du rafraîchissement de l\'historique:', error);
    }
  };
  
  // Calculer le nombre total de pages
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  
  // Fonction pour changer de page
  const paginate = (pageNumber: number) => {
    setPage(pageNumber);
  };
  
  // Mettre à jour les éléments courants et le nombre total d'élééments
  useEffect(() => {
    if (history.length > 0) {
      // Filtrer par statut si nécessaire
      let filteredHistory = [...history];
      
      if (statusFilter !== 'TOUS') {
        filteredHistory = filteredHistory.filter(
          item => item.status === statusFilter
        );
      }
      
      // Filtrer par plage de dates si spécifié
      if (dateFilter.from || dateFilter.to) {
        filteredHistory = filteredHistory.filter(item => {
          const itemDate = new Date(item.createdAt);
          const fromDate = dateFilter.from ? new Date(dateFilter.from.setHours(0, 0, 0, 0)) : null;
          const toDate = dateFilter.to ? new Date(dateFilter.to.setHours(23, 59, 59, 999)) : null;
          
          return (
            (!fromDate || itemDate >= fromDate) &&
            (!toDate || itemDate <= toDate)
          );
        });
      }
      
      // Trier les commandes par date (du plus récent au plus ancien)
      const sortedHistory = filteredHistory.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      setTotalItems(sortedHistory.length);
      const startIndex = (page - 1) * pageSize;
      const paginatedData = sortedHistory.slice(startIndex, startIndex + pageSize);
      setCurrentItems(paginatedData);
      
      // Réinitialiser à la première page si le filtre change et que la page actuelle n'est plus valide
      if (page > 1 && (page - 1) * pageSize >= sortedHistory.length) {
        setPage(1);
      }
    } else {
      setCurrentItems([]);
      setTotalItems(0);
    }
  }, [history, page, pageSize, statusFilter, dateFilter]);

  const handlePurchase = async () => {
    if (quantity < 1) {
      toast({
        title: 'Erreur',
        description: 'La quantité doit être supérieure à 0',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const user = getUserFromCookies();
      if (!user) {
        throw new Error('Utilisateur non connecté');
      }

      // Générer une clé unique pour l'idempotence
      const idempotencyKey = uuidv4();
      
      // Appel API pour l'achat de crédits
      await purchaseCredits({
        clientId: user.id,
        quantity: quantity,
        idempotencyKey: idempotencyKey
      });
      
      toast({
        title: 'Succès',
        description: `Commande de ${quantity} crédit(s) effectuée avec succès`,
      });
      
      // Réinitialiser le formulaire et rafraîchir l'historique
      setQuantity(1);
      await refreshHistory();
      
    } catch (error) {
      console.error('Erreur lors de la commande:', error);
      const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue';
      toast({
        title: 'Erreur',
        description: `Échec de la commande : ${errorMessage}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Commandes des SMS</h2>
        <p className="text-muted-foreground">
          Compte prépayé
        </p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Passer une commande</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="quantity">Nombre de crédits</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="mt-1"
                  />
                </div>
                
                {/* Aperçu du coût */}
                {clientInfo && (
                  <div className="space-y-2 p-4 bg-gray-50 rounded-lg border">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Prix unitaire:</span>
                      <span className="font-medium">{Math.round(clientInfo.coutSmsTtc)} F CFA</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Quantité:</span>
                      <span className="font-medium">{quantity}</span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between font-semibold">
                        <span>Total estimé:</span>
                        <span className="text-primary">
                          {estimatedCost !== null ? `${Math.round(estimatedCost)} F CFA` : '-'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="relative group mt-4">
                  <Button 
                    className={`w-full py-6 text-base font-medium transition-opacity duration-200 bg-primary hover:bg-primary/90 ${
                      (isLoading || !estimatedCost || hasPendingRequest) ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                    size="lg"
                    onClick={handlePurchase}
                    disabled={isLoading || !estimatedCost || hasPendingRequest}
                  >
                    {isLoading ? (
                      'Traitement en cours...'
                    ) : hasPendingRequest ? (
                      'Commande en attente'
                    ) : (
                      'Confirmer la commande'
                    )}
                  </Button>
                  {hasPendingRequest && (
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1.5 px-3 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
                      Une commande est déjà en attente de validation
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-gray-800 rotate-45"></div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>Historique des commandes</CardTitle>
              <div className="flex flex-col sm:flex-row gap-4 w-full">
                <div className="flex items-center space-x-2">
                  <Select 
                    value={statusFilter} 
                    onValueChange={(value) => {
                      setStatusFilter(value);
                      setPage(1); // Reset à la première page lors du changement de filtre
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filtrer par statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TOUS">Tous les statuts</SelectItem>
                      <SelectItem value="PENDING">En attente</SelectItem>
                      <SelectItem value="APPROVED">Approuvé</SelectItem>
                      <SelectItem value="REJECTED">Rejeté</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="date"
                        variant="outline"
                        className={cn(
                          "w-[240px] justify-start text-left font-normal",
                          !dateFilter && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateFilter?.from ? (
                          dateFilter.to ? (
                            <>
                              {format(dateFilter.from, "dd/MM/yyyy")} -{" "}
                              {format(dateFilter.to, "dd/MM/yyyy")}
                            </>
                          ) : (
                            format(dateFilter.from, "dd/MM/yyyy")
                          )
                        ) : (
                          <span>Filtrer par date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateFilter?.from || new Date()}
                        selected={dateFilter}
                        onSelect={(range) => {
                          setDateFilter({
                            from: range?.from,
                            to: range?.to,
                          });
                          setPage(1);
                        }}
                        numberOfMonths={1}
                        className="rounded-md border"
                      />
                      <div className="p-2 text-center text-sm">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setDateFilter({});
                            setPage(1);
                          }}
                        >
                          Réinitialiser
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingHistory ? (
                <div className="text-center py-4">Chargement de l'historique...</div>
              ) : history.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  Aucune commande récente
                </div>
              ) : (
                <div className="space-y-4">
                  {currentItems.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">Commande #{item.requestCode}</div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(item.createdAt), 'PPPp', { locale: fr })}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{item.quantity} crédit(s)</div>
                          {item.estimatedAmountTtc && (
                            <div className="text-sm">
                              {`${item.estimatedAmountTtc} € TTC`}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 flex justify-between items-center">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.status === 'PENDING' 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : item.status === 'APPROVED'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {item.status === 'PENDING' 
                              ? 'En attente' 
                              : item.status === 'APPROVED'
                              ? 'Approuvé'
                              : 'Rejeté'}
                          </span>
                          {item.status === 'REJECTED' && item.rejectReason && (
                            <div className="text-xs text-red-600 mt-1">
                              <span className="font-medium">Raison :</span> {item.rejectReason}
                            </div>
                          )}
                        </div>
                        {item.validatedAt && (
                          <div className="text-xs text-muted-foreground">
                            Traité le {format(new Date(item.validatedAt), 'Pp', { locale: fr })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {/* Pagination */}
                  {totalItems > 0 && (
                    <div className="flex items-center justify-between px-2 py-4">
                      <div className="text-sm text-muted-foreground">
                        Affichage de {(page - 1) * pageSize + 1} à{' '}
                        {Math.min(page * pageSize, totalItems)} sur {totalItems} commandes
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => paginate(1)}
                          disabled={page === 1}
                          className="h-8 w-8 p-0"
                        >
                          &laquo;
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => paginate(Math.max(1, page - 1))}
                          disabled={page === 1}
                          className="h-8 w-8 p-0"
                        >
                          &lsaquo;
                        </Button>
                        <div className="px-4 text-sm">
                          Page {page} sur {totalPages}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => paginate(Math.min(totalPages, page + 1))}
                          disabled={page >= totalPages}
                          className="h-8 w-8 p-0"
                        >
                          &rsaquo;
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => paginate(totalPages)}
                          disabled={page >= totalPages}
                          className="h-8 w-8 p-0"
                        >
                          &raquo;
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
