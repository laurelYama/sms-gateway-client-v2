'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Download, FileText, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getFacturesClient, getCalendrierFacturation, downloadFacturePdf, type Facture, type CalendrierFacturation } from '@/lib/api/billing';
import { getTokenFromCookies } from '@/lib/auth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRouter } from 'next/navigation';

export default function FacturesPage() {
  const [factures, setFactures] = useState<Facture[]>([]);
  const [calendrier, setCalendrier] = useState<CalendrierFacturation[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasValidYear, setHasValidYear] = useState(false);
  const router = useRouter();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showCalendar, setShowCalendar] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = factures.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(factures.length / rowsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [rowsPerPage]);

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd MMMM yyyy', { locale: fr });
  };

  const isCurrentMonth = (monthNumber: number) => {
    const currentDate = new Date();
    return currentDate.getMonth() + 1 === monthNumber && currentDate.getFullYear() === selectedYear;
  };

  const fetchFactures = async () => {
    try {
      console.log('Début du chargement des factures...');
      setLoading(true);
      const data = await getFacturesClient();

      const facturesValides = Array.isArray(data)
          ? data.filter(f => f && typeof f === 'object' && 'id' in f)
          : [];

      setFactures(facturesValides);
    } catch (error) {
      console.error('Erreur lors de la récupération des factures:', error);
      toast.error('Erreur lors du chargement des factures');
      setFactures([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCalendrier = async (year: number, isRetry: boolean = false) => {
    try {
      // Ne pas essayer de charger si on est déjà en train de charger
      if (loading) return;
      
      setLoading(true);
      console.log(`Récupération du calendrier pour l'année ${year}...`);
      
      const data = await getCalendrierFacturation(year);
      
      if (!data || data.length === 0) {
        console.log(`Aucune donnée de calendrier disponible pour l'année ${year}`);
        setCalendrier([]);
        
        // Essayer l'année précédente si possible et si c'est la première tentative
        const currentYear = new Date().getFullYear();
        if (!isRetry && year > currentYear - 5) {
          console.log(`Tentative avec l'année précédente (${year - 1})...`);
          setSelectedYear(year - 1);
          return;
        }
        
        // Si c'est une tentative de secours, ne pas afficher de message
        if (!isRetry) {
          toast.error(`Aucun calendrier de facturation disponible pour l'année ${year}`);
        }
        
        setHasValidYear(false);
        return;
      }
      
      console.log(`Calendrier chargé avec ${data.length} entrées`);
      setCalendrier(data);
      setHasValidYear(true);
      
    } catch (error: any) {
      console.error('Erreur lors de la récupération du calendrier:', error);
      
      // Gestion des erreurs spécifiques
      if (error.status === 401) {
        router.push('/login');
        return;
      } 
      
      // Si c'est une erreur liée à une année non trouvée ou non ouverte
      if (error.status === 404 || error.code === 'YEAR_NOT_FOUND' || error.code === 'YEAR_NOT_OPEN') {
        const currentYear = new Date().getFullYear();
        
        // Essayer l'année précédente si possible et si c'est la première tentative
        if (!isRetry && year > currentYear - 5) {
          console.log(`Tentative avec l'année précédente (${year - 1}) suite à une erreur...`);
          setSelectedYear(year - 1);
          return;
        }
      }
      
      // Si on arrive ici, c'est qu'aucune année valide n'a été trouvée
      setHasValidYear(false);
      setCalendrier([]);
      
      // Ne pas afficher de message d'erreur si c'est une tentative de secours
      if (!isRetry) {
        toast.error('Aucun calendrier disponible');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadFacture = async (facture: Facture) => {
    try {
      const filename = `Facture_${format(new Date(facture.dateDebut), 'MM_yyyy')}.pdf`;
      await downloadFacturePdf(facture.id, filename);
    } catch (error) {
      console.error('Erreur lors du téléchargement de la facture:', error);
      toast.error('Erreur lors du téléchargement de la facture');
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (!isMounted) return;
      
      try {
        setLoading(true);
        
        // Charger d'abord les factures
        await fetchFactures();
        
        // Puis essayer de charger le calendrier
        if (isMounted) {
          await fetchCalendrier(selectedYear, false);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
  }, [selectedYear]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  // Afficher un message d'avertissement si nécessaire, mais continuer à afficher le contenu
  const WarningBanner = () => {
    if (!hasValidYear && !loading) {
      return (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-md">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.485 3.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 3.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Aucun calendrier de facturation disponible pour l'année sélectionnée. Les données affichées peuvent être incomplètes.
              </p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <WarningBanner />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center">
          <h1 className="text-2xl sm:text-3xl font-bold">Mes factures</h1>
        </div>
          <div className="flex items-center space-x-4">
            {/* Bouton calendrier */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Afficher le calendrier
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-[98vw] h-[90vh] overflow-hidden p-0">
                <DialogHeader>
                  <DialogTitle className="flex items-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    Calendrier de facturation {selectedYear}
                  </DialogTitle>
                </DialogHeader>
                <div className="p-6 h-[calc(90vh-100px)] overflow-auto">
                  {loading ? (
                      <div className="text-center py-8">Chargement du calendrier...</div>
                  ) : (
                      <div className="w-full">
                        <div className="border rounded-lg overflow-hidden">
                          <Table className="w-full">
                            <TableHeader className="bg-muted/50">
                              <TableRow>
                                <TableHead className="w-[220px] px-6 py-4 font-medium">Mois</TableHead>
                                <TableHead className="px-6 py-4 font-medium">Période de consommation</TableHead>
                                <TableHead className="w-[220px] px-6 py-4 font-medium">Date de génération</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {calendrier.map((item) => {
                                const mois = new Date(2000, item.mois - 1, 1).toLocaleString('fr-FR', { month: 'long' });
                                return (
                                    <TableRow
                                        key={item.id}
                                        className={`${isCurrentMonth(item.mois) ? 'bg-primary/5' : ''} hover:bg-muted/50`}
                                    >
                                      <TableCell className="px-6 py-4">
                                        <div className="flex items-center">
                                          <span className="capitalize font-medium">{mois}</span>
                                          {isCurrentMonth(item.mois) && (
                                              <span className="ml-3 px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                                        En cours
                                      </span>
                                          )}
                                        </div>
                                      </TableCell>
                                      <TableCell className="px-6 py-4">
                                        <div className="flex items-center">
                                          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                                          <span>
                                      {formatDate(item.dateDebutConsommation)} - {formatDate(item.dateFinConsommation)}
                                    </span>
                                        </div>
                                      </TableCell>
                                      <TableCell className="px-6 py-4">
                                        <div className="flex items-center">
                                          <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                                          <span>{formatDate(item.dateGenerationFacture)}</span>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            {/* Sélection année */}
            <div className="flex items-center space-x-2">
              <span>Année :</span>
              <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="rounded-md border border-input bg-background px-3 py-1"
              >
                {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Liste des factures */}
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Mes factures
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                  <div className="text-center py-8">Chargement des factures...</div>
              ) : factures.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">Aucune facture disponible</div>
              ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Période</TableHead>
                          <TableHead>Consommation SMS</TableHead>
                          <TableHead>Prix unitaire</TableHead>
                          <TableHead>Montant</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentRows.length > 0 ? (
                            currentRows.map((facture) => (
                                <TableRow key={facture.id}>
                                  <TableCell>
                                    {formatDate(facture.dateDebut)} - {formatDate(facture.dateFin)}
                                  </TableCell>
                                  <TableCell>{facture.consommationSms} SMS</TableCell>
                                  <TableCell>{facture.prixUnitaire} FCFA</TableCell>
                                  <TableCell>{facture.montant} FCFA</TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end space-x-2">
                                      <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleDownloadFacture(facture)}
                                      >
                                        <Download className="w-4 h-4 mr-2" />
                                        Télécharger
                                      </Button>
                                      <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={async () => {
                                            try {
                                              const token = getTokenFromCookies();
                                              if (!token) throw new Error('Non authentifié');

                                              const response = await fetch(
                                                  `https://api-smsgateway.solutech-one.com/api/V1/billing/factures/${facture.id}/pdf`,
                                                  {
                                                    headers: { Authorization: `Bearer ${token}` },
                                                  }
                                              );

                                              if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);

                                              const blob = await response.blob();
                                              const url = window.URL.createObjectURL(blob);
                                              window.open(url, '_blank');
                                            } catch (error) {
                                              console.error('Erreur lors de l\'ouverture de la facture:', error);
                                              toast({
                                                title: 'Erreur',
                                                description: 'Impossible d\'ouvrir la facture',
                                                variant: 'destructive',
                                              });
                                            }
                                          }}
                                      >
                                        <FileText className="w-4 h-4 mr-2" />
                                        Voir
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-4">
                                Aucune facture disponible
                              </TableCell>
                            </TableRow>
                        )}
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
