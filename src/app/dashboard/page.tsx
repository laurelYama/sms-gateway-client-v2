"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

// Fonction pour décoder le payload JWT
const decodeJwtPayload = (token: string) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Erreur lors du décodage du token:', e);
    return null;
  }
};

// Fonction pour résoudre l'ID client à partir des cookies ou du token
const resolveClientId = (): string | undefined => {
  try {
    // 1. Essayer depuis les cookies
    const userFromCookies = JSON.parse(Cookies.get('user') || '{}');
    if (userFromCookies?.id) return String(userFromCookies.id);
    
    // 2. Essayer depuis le token
    const token = Cookies.get('authToken');
    if (token) {
      const payload = decodeJwtPayload(token);
      if (payload?.id) return String(payload.id);
      if (payload?.sub) return String(payload.sub);
    }
    
    console.warn('Impossible de résoudre l\'ID client');
    return undefined;
  } catch (error) {
    console.error('Erreur lors de la résolution de l\'ID client:', error);
    return undefined;
  }
};

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Users, UsersRound, Send, CheckCircle, CreditCard } from 'lucide-react';
import { getTokenFromCookies, getUserFromCookies } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { API_ENDPOINTS } from '@/config/api';
import { SmsDailyChart } from '@/components/dashboard/SmsDailyChart';

export default function DashboardPage() {
  const router = useRouter();
  const [smsCount, setSmsCount] = useState<number | null>(null);
  const [loadingSms, setLoadingSms] = useState<boolean>(false);
  const [smsError, setSmsError] = useState<string | null>(null);
  const [smsUnides, setSmsUnides] = useState<any[] | null>(null);
  const [smsMuldes, setSmsMuldes] = useState<any[] | null>(null);
  const [smsMuldesp, setSmsMuldesp] = useState<any[] | null>(null);
  const [groupCount, setGroupCount] = useState<number | null>(null);
  const [loadingGroups, setLoadingGroups] = useState<boolean>(false);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [contactCount, setContactCount] = useState<number | null>(null);
  const [loadingContacts, setLoadingContacts] = useState<boolean>(false);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [consumption, setConsumption] = useState<number | null>(null);
  const [loadingConsumption, setLoadingConsumption] = useState<boolean>(false);
  const [consumptionError, setConsumptionError] = useState<string | null>(null);
  const [ordersApproved, setOrdersApproved] = useState<number | null>(null);
  const [loadingOrders, setLoadingOrders] = useState<boolean>(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<'PREPAYE' | 'POSTPAYE' | null>(null);
  const [soldeNet, setSoldeNet] = useState<number | null>(null);
  const [loadingSolde, setLoadingSolde] = useState<boolean>(false);
  const [soldeError, setSoldeError] = useState<string | null>(null);

  // État pour les tickets
  const [tickets, setTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState<boolean>(false);
  const [ticketsError, setTicketsError] = useState<string | null>(null);

  // Fonction pour récupérer le dernier ticket du client
  const fetchTickets = async (clientId: string) => {
    try {
      setLoadingTickets(true);
      setTicketsError(null);
      const token = getTokenFromCookies();
      
      if (!token) {
        console.error('Aucun token d\'authentification trouvé');
        window.location.href = '/login';
        return;
      }
      
      // Utiliser la configuration centralisée de l'API
      const url = API_ENDPOINTS.tickets.getByClient(clientId);
      
      console.log('Fetching tickets from:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include'
      });
      
      if (response.status === 401) {
        console.error('Erreur 401 - Redirection vers /login');
        window.location.href = '/login';
        return;
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erreur HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Tickets data received:', data);
      
      if (!Array.isArray(data)) {
        throw new Error('Format de réponse inattendu');
      }
      
      // Filtrer et trier pour obtenir le dernier ticket fermé
      const closedTickets = data
        .filter(ticket => ticket.statut === 'FERME')
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      
      setTickets(closedTickets.length > 0 ? [closedTickets[0]] : []);
    } catch (err: any) {
      console.error('Error fetching tickets:', err);
      setTicketsError(err.message || 'Impossible de charger les tickets');
      setTickets([]);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    const safeFetchJson = async (url: string, token?: string) => {
      console.log('[Dashboard] Fetching:', url, 'with token?', Boolean(token));
      const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    };
    const fetchSoldeNet = async () => {
      try {
        setLoadingSolde(true);
        setSoldeError(null);
        const clientId = resolveClientId();
        if (!clientId) {
          setSoldeError('ClientId introuvable');
          setSoldeNet(0);
          return;
        }
        const token = getTokenFromCookies();
        console.log('[Dashboard] SoldeNet clientId=', clientId);
        const res = await fetch(`https://api-smsgateway.solutech-one.com/api/V1/clients/${clientId}/solde-net`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const value = Number(data?.soldeNet) || 0;
        setSoldeNet(value);
      } catch (e) {
        setSoldeError(e instanceof Error ? e.message : 'Erreur inconnue');
        setSoldeNet(0);
      } finally {
        setLoadingSolde(false);
      }
    };

    const decodeJwtPayload = (token: string): any | null => {
      try {
        const parts = token.split('.');
        if (parts.length < 2) return null;
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const json = decodeURIComponent(
          atob(base64)
            .split('')
            .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        return JSON.parse(json);
      } catch {
        return null;
      }
    };

    const resolveClientId = (): string | undefined => {
      // 1) Try from auth token payload
      const token = getTokenFromCookies();
      if (token) {
        const payload = decodeJwtPayload(token);
        const fromToken =
          payload?.id ||
          payload?.clientId ||
          payload?.client_id ||
          payload?.cid ||
          payload?.idclients ||
          payload?.idclient ||
          payload?.client ||
          payload?.sub; // dernier recours si le sub est le clientId
        if (fromToken) return String(fromToken);
      }
      // 2) Fallback to cookie user
      const cookieUser: any = getUserFromCookies();
      if (cookieUser) {
        if (cookieUser.clientId) return String(cookieUser.clientId);
        if (cookieUser.id) return String(cookieUser.id);
      }
      // 3) Fallback to localStorage user
      const lsUser = JSON.parse(localStorage?.getItem('user') || '{}');
      if (lsUser?.clientId) return String(lsUser.clientId);
      if (lsUser?.id) return String(lsUser.id);
      return undefined;
    };

    const resolveAccountType = (): 'PREPAYE' | 'POSTPAYE' | null => {
      const token = getTokenFromCookies();
      if (token) {
        const payload = decodeJwtPayload(token);
        const t = payload?.typeCompte || payload?.type_compte || payload?.accountType;
        if (t === 'PREPAYE' || t === 'POSTPAYE') return t;
      }
      const cookieUser: any = getUserFromCookies();
      if (cookieUser?.typeCompte === 'PREPAYE' || cookieUser?.typeCompte === 'POSTPAYE') return cookieUser.typeCompte;
      const lsUser = JSON.parse(localStorage?.getItem('user') || '{}');
      if (lsUser?.typeCompte === 'PREPAYE' || lsUser?.typeCompte === 'POSTPAYE') return lsUser.typeCompte;
      return null;
    };

    const fetchSmsCount = async () => {
      try {
        setLoadingSms(true);
        setSmsError(null);
        const clientId = resolveClientId();
        if (!clientId) {
          setSmsError('ClientId introuvable');
          setSmsCount(0);
          return;
        }
        const token = getTokenFromCookies();
        console.log('[Dashboard] SMS clientId=', clientId);
        const [unides, muldes, muldesp] = await Promise.all([
          safeFetchJson(`https://api-smsgateway.solutech-one.com/api/V1/sms/unides/${clientId}`, token),
          safeFetchJson(`https://api-smsgateway.solutech-one.com/api/V1/sms/muldes/${clientId}`, token),
          safeFetchJson(`https://api-smsgateway.solutech-one.com/api/V1/sms/muldesp/${clientId}`, token),
        ]);
        // stocker les données brutes pour recalculs
        setSmsUnides(Array.isArray(unides) ? unides : []);
        setSmsMuldes(Array.isArray(muldes) ? muldes : []);
        setSmsMuldesp(Array.isArray(muldesp) ? muldesp : []);
        const isInThisMonth = (dateStr?: string) => {
          if (!dateStr) return false;
          const dt = new Date(dateStr);
          if (isNaN(dt.getTime())) return false;
          const now = new Date();
          return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth();
        };
        const countSent = (arr: any): number => Array.isArray(arr)
          ? arr.filter((x: any) => x?.statut === 'ENVOYE' && isInThisMonth(x?.createdAt)).length
          : 0;
        const total = countSent(unides) + countSent(muldes) + countSent(muldesp);
        console.log('[Dashboard] SMS counts:', {
          unides: countSent(unides),
          muldes: countSent(muldes),
          muldesp: countSent(muldesp),
          total,
        });
        setSmsCount(total);
      } catch (e) {
        setSmsError(e instanceof Error ? e.message : 'Erreur inconnue');
        console.error('[Dashboard] SMS fetch error:', e);
        setSmsCount(0);
      } finally {
        setLoadingSms(false);
      }
    };
    const fetchGroupsCount = async () => {
      try {
        setLoadingGroups(true);
        setGroupsError(null);
        const clientId = resolveClientId();
        if (!clientId) {
          setGroupsError('ClientId introuvable');
          setGroupCount(0);
          return;
        }
        const token = getTokenFromCookies();
        console.log('[Dashboard] Groups clientId=', clientId);
        const res = await fetch(`https://api-smsgateway.solutech-one.com/api/V1/clientsGroups?clientId=${clientId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        console.log('[Dashboard] Groups count=', Array.isArray(data) ? data.length : 0);
        setGroupCount(Array.isArray(data) ? data.length : 0);
      } catch (e) {
        setGroupsError(e instanceof Error ? e.message : 'Erreur inconnue');
        console.error('[Dashboard] Groups fetch error:', e);
        setGroupCount(0);
      } finally {
        setLoadingGroups(false);
      }
    };
    const fetchContactsCount = async () => {
      try {
        setLoadingContacts(true);
        setContactsError(null);
        const clientId = resolveClientId();
        if (!clientId) {
          setContactsError('ClientId introuvable');
          setContactCount(0);
          return;
        }
        const token = getTokenFromCookies();
        console.log('[Dashboard] Contacts clientId=', clientId);
        const res = await fetch(`https://api-smsgateway.solutech-one.com/api/V1/contacts/client/${clientId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        console.log('[Dashboard] Contacts count=', Array.isArray(data) ? data.length : 0);
        setContactCount(Array.isArray(data) ? data.length : 0);
      } catch (e) {
        setContactsError(e instanceof Error ? e.message : 'Erreur inconnue');
        console.error('[Dashboard] Contacts fetch error:', e);
        setContactCount(0);
      } finally {
        setLoadingContacts(false);
      }
    };
    const fetchConsumption = async () => {
      try {
        setLoadingConsumption(true);
        setConsumptionError(null);
        const clientId = resolveClientId();
        if (!clientId) {
          setConsumptionError('ClientId introuvable');
          setConsumption(0);
          return;
        }
        const token = getTokenFromCookies();
        console.log('[Dashboard] Consumption clientId=', clientId);
        const res = await fetch(`https://api-smsgateway.solutech-one.com/api/V1/billing/factures/client/${clientId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const total = Array.isArray(data)
          ? data.reduce((sum: number, item: any) => sum + (Number(item?.consommationSms) || 0), 0)
          : 0;
        console.log('[Dashboard] Consumption total=', total);
        setConsumption(total);
      } catch (e) {
        setConsumptionError(e instanceof Error ? e.message : 'Erreur inconnue');
        console.error('[Dashboard] Consumption fetch error:', e);
        setConsumption(0);
      } finally {
        setLoadingConsumption(false);
      }
    };

    const fetchApprovedOrders = async () => {
      try {
        setLoadingOrders(true);
        setOrdersError(null);
        const clientId = resolveClientId();
        if (!clientId) {
          setOrdersError('ClientId introuvable');
          setOrdersApproved(0);
          return;
        }
        const token = getTokenFromCookies();
        console.log('[Dashboard] Orders clientId=', clientId);
        const res = await fetch(API_ENDPOINTS.CREDITS(clientId), {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const content = Array.isArray(data?.content) ? data.content : [];
        const approved = content.filter((it: any) => String(it?.status).toUpperCase() === 'APPROVED').length;
        console.log('[Dashboard] Orders approved=', approved);
        setOrdersApproved(approved);
      } catch (e) {
        setOrdersError(e instanceof Error ? e.message : 'Erreur inconnue');
        console.error('[Dashboard] Orders fetch error:', e);
        setOrdersApproved(0);
      } finally {
        setLoadingOrders(false);
      }
    };
    // Resolve account type once
    const type = resolveAccountType();
    setAccountType(type);
  }, []);

  // Vérification d'authentification et chargement des données
  useEffect(() => {
    // Vérifier si on est côté client
    if (typeof window === 'undefined') return;

    // Fonction pour vérifier l'authentification
    const checkAuth = (): boolean => {
      const token = getTokenFromCookies();
      if (!token) {
        console.log('[Dashboard] Aucun token trouvé, redirection vers /login');
        // Ne pas utiliser window.location pour éviter les rechargements complets
        router.push('/login');
        return false;
      }
      
      try {
        const payload = decodeJwtPayload(token);
        const now = Math.floor(Date.now() / 1000);
        
        if (payload?.exp && payload.exp < now) {
          console.log('[Dashboard] Token expiré, redirection vers /login');
          router.push('/login');
          return false;
        }
        
        return true;
      } catch (error) {
        console.error('[Dashboard] Erreur lors de la vérification du token:', error);
        router.push('/login');
        return false;
      }
    };
    return () => {
      // Annuler les requêtes en cours si nécessaire
    };
  }, []);

  // Fonction pour charger le solde net
  const fetchSoldeNet = async () => {
    try {
      const token = getTokenFromCookies();
      if (!token) return;
      
      const clientId = resolveClientId();
      if (!clientId) return;
      
      const response = await fetch(`https://api-smsgateway.solutech-one.com/api/V1/clients/${clientId}/solde-net`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération du solde');
      }
      
      const data = await response.json();
      // Mettre à jour l'état avec le solde net
      // setSoldeNet(data?.soldeNet || 0);
      
    } catch (error) {
      console.error('Erreur fetchSoldeNet:', error);
      // setSoldeError(error instanceof Error ? error.message : 'Erreur inconnue');
    }
  };

  // La fonction fetchTickets est déjà définie plus haut dans le fichier
  // Elle est utilisée pour récupérer les tickets du client

  // Toggle période pour la section "SMS par période"
  const [period, setPeriod] = useState<'today' | '7d' | 'month'>('month');

  const filterByPeriodAndSent = (arr: any[] | null) => {
    if (!Array.isArray(arr)) return [];
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOf7d = new Date(startOfToday);
    startOf7d.setDate(startOf7d.getDate() - 6); // inclut aujourd'hui => 7 jours
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return arr.filter((x: any) => {
      if (x?.statut !== 'ENVOYE') return false;
      const d = x?.createdAt ? new Date(x.createdAt) : null;
      if (!d || isNaN(d.getTime())) return false;
      if (period === 'today') return d >= startOfToday;
      if (period === '7d') return d >= startOf7d;
      return d >= startOfMonth; // month
    });
  };

  const periodCounts = useMemo(() => {
    const u = filterByPeriodAndSent(smsUnides);
    const m = filterByPeriodAndSent(smsMuldes);
    const p = filterByPeriodAndSent(smsMuldesp);
    return {
      unides: u.length,
      muldes: m.length,
      muldesp: p.length,
      total: u.length + m.length + p.length,
    };
  }, [smsUnides, smsMuldes, smsMuldesp, period]);

  // Préparer les données pour le graphique quotidien
  const dailySmsData = useMemo(() => {
    if (!smsUnides || !smsMuldes || !smsMuldesp) return [];

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = new Date();
    
    // Créer un tableau avec tous les jours du mois
    const daysInMonth = eachDayOfInterval({
      start: startOfMonth,
      end: today,
    });
    
    // Compter les SMS par type et par jour
    const countByDay = (items: any[]) => {
      const counts = new Map<string, number>();
      items.forEach(item => {
        if (item?.statut !== 'ENVOYE' || !item?.createdAt) return;
        
        const date = parseISO(item.createdAt);
        if (isNaN(date.getTime())) return;
        
        const dayKey = format(date, 'yyyy-MM-dd');
        counts.set(dayKey, (counts.get(dayKey) || 0) + 1);
      });
      return counts;
    };
    
    const unidesByDay = countByDay(smsUnides);
    const muldesByDay = countByDay(smsMuldes);
    const muldespByDay = countByDay(smsMuldesp);
    
    // Créer le dataset final pour le graphique
    return daysInMonth.map(day => {
      const dayKey = format(day, 'yyyy-MM-dd');
      return {
        date: format(day, 'd MMM'),
        'Message simple': unidesByDay.get(dayKey) || 0,
        'Message groupé': muldesByDay.get(dayKey) || 0,
        'Message programmé': muldespByDay.get(dayKey) || 0,
        total: (unidesByDay.get(dayKey) || 0) + 
               (muldesByDay.get(dayKey) || 0) + 
               (muldespByDay.get(dayKey) || 0)
      };
    });
  }, [smsUnides, smsMuldes, smsMuldesp]);

const SmsDailyChart = ({ data }: SmsDailyChartProps) => (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 20,
            left: 0,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={30}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              fontSize: '0.875rem',
            }}
          />
          <Legend 
            wrapperStyle={{
              paddingTop: '1rem',
              fontSize: '0.875rem',
            }}
          />
          <Line 
            type="monotone" 
            dataKey="Message simple" 
            stroke="#3b82f6" 
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line 
            type="monotone" 
            dataKey="Message groupé" 
            stroke="#10b981" 
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line 
            type="monotone" 
            dataKey="Message programmé" 
            stroke="#8b5cf6" 
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  const stats = [
    {
      title: 'Messages envoyés',
      value: smsCount === null ? (loadingSms ? '...' : '0') : `${smsCount}`,
      change: smsError ? 'Erreur' : '',
      icon: Send,
    },
    // Groupes dynamiques
    {
      title: 'Groupes',
      value: groupCount === null ? (loadingGroups ? '...' : '0') : `${groupCount}`,
      change: groupsError ? 'Erreur' : '',
      icon: Users,
    },
    // Contacts dynamiques
    {
      title: 'Contacts',
      value: contactCount === null ? (loadingContacts ? '...' : '0') : `${contactCount}`,
      change: contactsError ? 'Erreur' : '',
      icon: UsersRound,
    },
    {
      title: 'Solde net',
      value: soldeNet === null ? (loadingSolde ? '...' : '0') : `${soldeNet}`,
      change: soldeError ? 'Erreur' : '',
      icon: CreditCard,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Bienvenue sur votre tableau de bord</h2>
        <p className="text-muted-foreground">
          Gérez vos messages, contacts et campagnes SMS en un seul endroit.
        </p>
      </div>

      {/* Statistiques */}
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
              {stat.change ? (
                <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* SMS envoyés par période */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <CardTitle>SMS envoyés par période</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant={period === 'today' ? 'default' : 'outline'} onClick={() => setPeriod('today')}>Aujourd'hui</Button>
            <Button size="sm" variant={period === '7d' ? 'default' : 'outline'} onClick={() => setPeriod('7d')}>7 jours</Button>
            <Button size="sm" variant={period === 'month' ? 'default' : 'outline'} onClick={() => setPeriod('month')}>Mois</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-3 rounded-md border">
              <div className="text-xs text-muted-foreground">Message simple</div>
              <div className="text-xl font-semibold">{loadingSms ? '...' : periodCounts.unides}</div>
            </div>
            <div className="p-3 rounded-md border">
              <div className="text-xs text-muted-foreground">Message groupé</div>
              <div className="text-xl font-semibold">{loadingSms ? '...' : periodCounts.muldes}</div>
            </div>
            <div className="p-3 rounded-md border">
              <div className="text-xs text-muted-foreground">Message programmé</div>
              <div className="text-xl font-semibold">{loadingSms ? '...' : periodCounts.muldesp}</div>
            </div>
            <div className="p-3 rounded-md border bg-primary/5">
              <div className="text-xs text-muted-foreground">TOTAL</div>
              <div className="text-2xl font-bold">{loadingSms ? '...' : periodCounts.total}</div>
            </div>
          </div>
          {smsError ? (
            <p className="text-xs text-red-500 mt-2">Erreur de récupération des SMS: {smsError}</p>
          ) : null}
        </CardContent>
      </Card>

      {/* Graphique des SMS par jour */}
      <Card>
        <CardHeader>
          <CardTitle>Activité des SMS - {format(new Date(), 'MMMM yyyy')}</CardTitle>
        </CardHeader>
        <CardContent>
          {dailySmsData.length > 0 ? (
            <SmsDailyChart data={dailySmsData} />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              {loadingSms ? 'Chargement...' : 'Aucune donnée disponible'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dernier ticket fermé */}
      <Card>
        <CardHeader>
          <CardTitle>Dernier ticket fermé</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTickets ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : ticketsError ? (
            <p className="text-sm text-red-500">{ticketsError}</p>
          ) : tickets.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun ticket fermé trouvé</p>
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="border rounded-lg p-4 bg-muted/10">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium">
                      {ticket.titre}
                      {ticket.statut === 'FERME' && (
                        <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800">
                          Fermé
                        </span>
                      )}
                      {ticket.statut === 'EN_COURS' && (
                        <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800">
                          En cours
                        </span>
                      )}
                      {ticket.statut === 'OUVERT' && (
                        <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-800">
                          Ouvert
                        </span>
                      )}
                    </h4>
                    <span className="text-xs text-muted-foreground">
                      {ticket.statut === 'FERME' ? 'Fermé' : 'Mis à jour'} le {new Date(ticket.updatedAt).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  <p className="text-sm mt-2">
                    {ticket.description}
                  </p>
                  {ticket.reponseAdmin && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Réponse du support :</p>
                      <div className="text-sm bg-white p-3 rounded border">
                        {ticket.reponseAdmin}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div className="text-center mt-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/dashboard/tickets">Voir tous les tickets</Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
