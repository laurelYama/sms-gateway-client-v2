"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import {
  eachDayOfInterval,
  format,
  parseISO,
} from "date-fns";
import {
  MessageSquare,
  Users,
  UsersRound,
  Send,
  CheckCircle,
  CreditCard,
  AlertCircle,
  Ticket as TicketIcon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchLastClosedTicket, Ticket } from "@/lib/api/tickets";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SmsDailyChart } from "@/components/dashboard/SmsDailyChart";
import { getTokenFromCookies, getUserFromCookies, decodeJwtPayload } from "@/lib/auth";
import { 
  getSmsCountThisMonth, 
  getClientGroups, 
  getClientContacts, 
  getClientSoldeNet, 
  getSmsStatsByPeriod,
  fetchSmsByType,
  SmsStats
} from "@/lib/api/sms";

export default function DashboardPage() {
  const router = useRouter();

  // États
  const [smsCount, setSmsCount] = useState<number | null>(null);
  const [loadingSms, setLoadingSms] = useState<boolean>(false);
  const [groupCount, setGroupCount] = useState<number | null>(null);
  const [contactCount, setContactCount] = useState<number | null>(null);
  const [soldeNet, setSoldeNet] = useState<number | null>(null);
  const [ordersApproved, setOrdersApproved] = useState<number | null>(null);
  const [consumption, setConsumption] = useState<number | null>(null);
  const [period, setPeriod] = useState<"today" | "7d" | "month">("month");
  const [smsStats, setSmsStats] = useState<{
    unides: any[];
    muldes: any[];
    muldesp: any[];
  }>({ unides: [], muldes: [], muldesp: [] });
  const [loadingStats, setLoadingStats] = useState<boolean>(false);
  const [lastClosedTicket, setLastClosedTicket] = useState<Ticket | null>(null);
  const [loadingTicket, setLoadingTicket] = useState<boolean>(false);

  // Simulation de récupération du client ID
  const resolveClientId = (): string | undefined => {
    const token = Cookies.get("authToken");
    if (token) {
      const payload = decodeJwtPayload(token);
      return payload?.id || payload?.sub;
    }
    const user = Cookies.get("user");
    if (user) {
      const parsed = JSON.parse(user);
      return parsed?.id;
    }
    return undefined;
  };

  // Récupérer le dernier ticket fermé
  const fetchLastTicket = async () => {
    const clientId = resolveClientId();
    if (!clientId) return;
    
    setLoadingTicket(true);
    try {
      const ticket = await fetchLastClosedTicket(clientId);
      setLastClosedTicket(ticket);
    } catch (error) {
      console.error('Erreur lors de la récupération du dernier ticket fermé:', error);
    } finally {
      setLoadingTicket(false);
    }
  };

  // Récupération des données du tableau de bord
  useEffect(() => {
    fetchLastTicket(); // Charger le dernier ticket fermé
    
    const fetchDashboardData = async () => {
      setLoadingSms(true);
      try {
        // Récupérer les données en parallèle
        const [smsCountData, groupsData, contactsData, soldeNetData] = await Promise.allSettled([
          getSmsCountThisMonth(),
          getClientGroups(),
          getClientContacts(),
          getClientSoldeNet()
        ]);

        // Traiter le résultat des SMS
        if (smsCountData.status === 'fulfilled') {
          setSmsCount(smsCountData.value);
        } else {
          console.error('Erreur lors du chargement des statistiques SMS:', smsCountData.reason);
          setSmsCount(0);
        }

        // Traiter le résultat des groupes
        if (groupsData.status === 'fulfilled') {
          setGroupCount(groupsData.value.length);
        } else {
          console.error('Erreur lors du chargement des groupes:', groupsData.reason);
          setGroupCount(0);
        }

        // Traiter le résultat des contacts
        if (contactsData.status === 'fulfilled') {
          setContactCount(contactsData.value.length);
        } else {
          console.error('Erreur lors du chargement des contacts:', contactsData.reason);
          setContactCount(0);
        }

        // Traiter le résultat du solde net
        if (soldeNetData.status === 'fulfilled') {
          setSoldeNet(soldeNetData.value.soldeNet);
        } else {
          console.error('Erreur lors du chargement du solde net:', soldeNetData.reason);
          setSoldeNet(0);
        }
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
        // En cas d'erreur, afficher 0
        setSmsCount(0);
        setGroupCount(0);
        setContactCount(0);
        setSoldeNet(0);
      } finally {
        setLoadingSms(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Charger et traiter les statistiques SMS
  const loadSmsStats = useCallback(async (period: "today" | "7d" | "month") => {
    setLoadingStats(true);
    try {
      console.log(`Chargement des statistiques pour la période: ${period}`);
      
      // Récupérer le token d'authentification
      const token = getTokenFromCookies();
      if (!token) {
        console.error('Aucun token d\'authentification trouvé');
        return;
      }
      
      // Définir l'URL de base de l'API
      const API_BASE_URL = 'https://api-smsgateway.solutech-one.com/api/V1';
      const clientId = resolveClientId(); // Récupérer l'ID client dynamiquement
      
      if (!clientId) {
        console.error('Impossible de déterminer l\'ID client');
        return;
      }
      
      // Fonction pour récupérer les données d'un type de SMS
      const fetchSmsData = async (type: 'unides' | 'muldes' | 'muldesp') => {
        try {
          const response = await fetch(`${API_BASE_URL}/sms/${type}/${clientId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
          }
          
          return await response.json();
        } catch (error) {
          console.error(`Erreur lors de la récupération des ${type}:`, error);
          return [];
        }
      };
      
      // Récupérer les données des trois types de messages en parallèle
      const [unides, muldes, muldesp] = await Promise.all([
        fetchSmsData('unides'),
        fetchSmsData('muldes'),
        fetchSmsData('muldesp')
      ]);
      
      console.log('Données récupérées:', { unides, muldes, muldesp });
      
      // Stocker les données brutes pour le graphique
      setSmsStats({
        unides: Array.isArray(unides) ? unides : [],
        muldes: Array.isArray(muldes) ? muldes : [],
        muldesp: Array.isArray(muldesp) ? muldesp : []
      });
      
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
      setSmsStats({
        unides: [],
        muldes: [],
        muldesp: []
      });
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // Charger les statistiques quand la période change
  useEffect(() => {
    loadSmsStats(period);
  }, [period, loadSmsStats]);

  // Les données sont déjà dans le bon format pour le graphique
  const { unides = [], muldes = [], muldesp = [] } = smsStats || {};

  // Statistiques du haut
  const stats = [
    {
      title: "SMS envoyés ce mois",
      value: loadingSms ? "..." : smsCount ?? "0",
      icon: Send,
    },
    {
      title: "Groupes",
      value: loadingSms ? "..." : groupCount ?? "0",
      icon: Users,
    },
    {
      title: "Contacts",
      value: loadingSms ? "..." : contactCount ?? "0",
      icon: UsersRound,
    },
    {
      title: "Solde net (FCFA)",
      value: loadingSms ? "..." : soldeNet?.toLocaleString() ?? "0",
      icon: CreditCard,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Bienvenue sur votre tableau de bord
        </h2>
        <p className="text-muted-foreground">
          Gérez vos messages, contacts et campagnes SMS en un seul endroit.
        </p>
      </div>

      {/* Statistiques principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Graphique des SMS et Dernier ticket fermé */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
        {/* Graphique des SMS */}
        <Card className="lg:col-span-5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Statistiques des SMS</CardTitle>
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant={period === "today" ? "default" : "outline"}
                onClick={() => setPeriod("today")}
                disabled={loadingStats}
              >
                Aujourd'hui
              </Button>
              <Button
                size="sm"
                variant={period === "7d" ? "default" : "outline"}
                onClick={() => setPeriod("7d")}
                disabled={loadingStats}
              >
                7j
              </Button>
              <Button
                size="sm"
                variant={period === "month" ? "default" : "outline"}
                onClick={() => setPeriod("month")}
                disabled={loadingStats}
              >
                Mois
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <div className="h-[300px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              <SmsDailyChart 
                unides={unides}
                muldes={muldes}
                muldesp={muldesp}
              />
            )}
          </CardContent>
        </Card>
        
        {/* Dernier ticket fermé */}
        <Card className="lg:col-span-2 flex flex-col h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <TicketIcon className="h-4 w-4 mr-2" /> Dernier ticket fermé
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col overflow-hidden">
            {loadingTicket ? (
              <div className="text-center py-4">Chargement du dernier ticket...</div>
            ) : lastClosedTicket ? (
              <div className="space-y-3 flex flex-col h-full">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-sm">{lastClosedTicket.titre}</h3>
                    <p className="text-xs text-muted-foreground">
                      {new Date(lastClosedTicket.updatedAt).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-800">
                    Fermé
                  </span>
                </div>
                <div className="text-xs text-muted-foreground flex-1 flex flex-col overflow-hidden">
                  <p className="font-medium mb-1">Votre demande :</p>
                  <div className="bg-gray-50 p-2 rounded-md text-xs overflow-y-auto max-h-20 mb-2">
                    {lastClosedTicket.description}
                  </div>
                </div>
                {lastClosedTicket.reponseAdmin && (
                  <div className="text-xs flex-1 flex flex-col overflow-hidden">
                    <p className="font-medium mb-1 text-green-700">Réponse :</p>
                    <div className="bg-green-50 border border-green-100 p-2 rounded-md text-green-800 overflow-y-auto max-h-32">
                      {lastClosedTicket.reponseAdmin}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground text-sm">
                <AlertCircle className="h-4 w-4 mx-auto mb-1" />
                <p>Aucun ticket fermé récemment</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
