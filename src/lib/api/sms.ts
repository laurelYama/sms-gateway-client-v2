import { getTokenFromCookies, getUserFromCookies } from '@/lib/auth';
import { API_BASE_URL } from '@/config/api';

export interface ClientGroup {
  idClientsGroups: string;
  nomGroupe: string;
  descriptionGroupe: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientContact {
  idClientsContacts: string;
  clientsGroup: ClientGroup;
  clientId: string;
  contactNumber: string;
  contactName: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientSoldeNet {
  clientId: string;
  typeCompte: string;
  soldeNet: number;
}

export interface SmsUnides {
  ref: string;
  type: string;
  destinataire: string;
  corps: string;
  emetteur: string;
  clientId: string;
  dateDebutEnvoi: string | null;
  dateFinEnvoi: string | null;
  nbParJour: number | null;
  intervalleMinutes: number | null;
  nbDejaEnvoye: number;
  statut: string;
  createdAt: string;
  updatedAt: string;
}

export interface SmsMuldes {
  ref: string;
  clientId: string;
  emetteur: string;
  corps: string;
  type: string;
  statut: string;
  createdAt: string;
  Destinataires: string[];
}

export type SmsStats = SmsUnides | SmsMuldes;

export interface SmsPeriodStatsParams {
  startDate: string; // Format: YYYY-MM-DD
  endDate: string;   // Format: YYYY-MM-DD
  groupBy: 'day' | 'week' | 'month';
}

interface MessageUnides {
  ref: string;
  type: string;
  destinataire: string;
  corps: string;
  emetteur: string;
  clientId: string;
  statut: string;
  createdAt: string;
  updatedAt: string;
}

interface MessageMuldes {
  ref: string;
  clientId: string;
  emetteur: string;
  corps: string;
  type: string;
  statut: string;
  createdAt: string;
  Destinataires: string[];
}

type Message = MessageUnides | MessageMuldes;

interface ApiResponse {
  data: Message[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Interface pour les erreurs API
interface ApiError extends Error {
  status?: number;
  data?: any;
}

/**
 * Récupère la liste des groupes d'un client
 * @returns Promise<ClientGroup[]> - Liste des groupes du client
 */
/**
 * Récupère la liste des contacts d'un client
 * @returns Promise<ClientContact[]> - Liste des contacts du client
 */
export const getClientContacts = async (): Promise<ClientContact[]> => {
  const token = getTokenFromCookies();
  if (!token) throw new Error('Non authentifié');
  
  const user = getUserFromCookies();
  if (!user?.id) throw new Error('Utilisateur non connecté');

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/V1/contacts/client/${user.id}`, 
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur ${response.status}: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la récupération des contacts:', error);
    throw error;
  }
};

/**
 * Récupère la liste des groupes d'un client
 * @returns Promise<ClientGroup[]> - Liste des groupes du client
 */
/**
 * Récupère le solde net d'un client
 * @returns Promise<ClientSoldeNet> - Solde net du client
 */
/**
 * Récupère les statistiques des SMS envoyés sur une période donnée
 * @param params Paramètres de la requête (dates et regroupement)
 * @returns Promise<SmsStats[]> - Tableau des statistiques par période
 */
interface SmsStatsResponse {
  totalSms: number;
  totalDestinataires: number;
  details: SmsStats[];
  parType: {
    [key: string]: {
      count: number;
      sum: number;
      min: number;
      max: number;
      average: number;
    };
  };
}

export const fetchSmsByType = async (type: 'unides' | 'muldes' | 'muldesp'): Promise<SmsStats[]> => {
  const token = getTokenFromCookies();
  if (!token) throw new Error('Non authentifié');
  
  const user = getUserFromCookies();
  if (!user?.id) throw new Error('Utilisateur non connecté');

  try {
    const url = `${API_BASE_URL}/api/V1/sms/${type}/${user.id}`;
    console.log(`Récupération des SMS de type ${type}:`, url);

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Erreur lors de la récupération des SMS ${type}:`, {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Erreur ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log(`Réponse des SMS ${type}:`, data);
    
    if (!Array.isArray(data)) {
      console.warn(`La réponse pour ${type} n'est pas un tableau:`, data);
      return [];
    }
    
    return data;
  } catch (error) {
    console.error(`Erreur lors de la récupération des SMS ${type}:`, error);
    return [];
  }
};

export const getSmsStatsByPeriod = async (): Promise<{date: string; count: number}[]> => {
  console.log('=== Début de getSmsStatsByPeriod ===');
  try {
    console.log('1. Récupération des SMS de tous les types...');
    const [unides, muldes, muldesp] = await Promise.all([
      fetchSmsByType('unides'),
      fetchSmsByType('muldes'),
      fetchSmsByType('muldesp')
    ]);

    console.log('2. Données brutes récupérées:', {
      unides: unides.length,
      muldes: muldes.length,
      muldesp: muldesp.length
    });

    // Combiner tous les SMS
    const allSms = [
      ...unides.map(sms => {
        const date = new Date(sms.createdAt);
        console.log(`UNIDES: ${sms.ref} - ${date} - 1 message`);
        return { date, count: 1 };
      }),
      ...muldes.flatMap(sms => {
        const date = new Date(sms.createdAt);
        const count = sms.Destinataires?.length || 1;
        console.log(`MULDES: ${sms.ref} - ${date} - ${count} destinataires`);
        return { date, count };
      }),
      ...muldesp.flatMap(sms => {
        const date = new Date(sms.createdAt);
        const count = sms.Destinataires?.length || 1;
        console.log(`MULDESP: ${sms.ref} - ${date} - ${count} destinataires`);
        return { date, count };
      })
    ];

    console.log('3. Total des SMS combinés:', allSms.length);

    // Grouper par jour
    const statsByDay = allSms.reduce((acc, {date, count}) => {
      const day = date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      if (!acc[day]) {
        acc[day] = 0;
      }
      acc[day] += count;
      return acc;
    }, {} as Record<string, number>);

    console.log('4. Statistiques par jour:', statsByDay);

    // Convertir en tableau d'objets {date, count} avec des objets Date valides
    const result = Object.entries(statsByDay).map(([dateStr, count]) => {
      // Créer une date à partir de la chaîne YYYY-MM-DD
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day); // Mois est 0-indexé dans Date
      
      return {
        date: date.toISOString(), // Format ISO pour la cohérence
        count,
        // Ajouter une propriété formatée pour le graphique
        formattedDate: date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
      };
    });

    console.log('5. Résultat final:', result);
    return result;
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques SMS:', error);
    return [];
  }
};

/**
 * Récupère le solde net d'un client
 * @returns Promise<ClientSoldeNet> - Solde net du client
 */
export const getClientSoldeNet = async (): Promise<ClientSoldeNet> => {
  const token = getTokenFromCookies();
  if (!token) throw new Error('Non authentifié');
  
  const user = getUserFromCookies();
  if (!user?.id) throw new Error('Utilisateur non connecté');

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/V1/clients/${user.id}/solde-net`, 
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur ${response.status}: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la récupération du solde net:', error);
    // Retourner un objet par défaut en cas d'erreur
    return {
      clientId: user.id,
      typeCompte: 'INCONNU',
      soldeNet: 0
    };
  }
};

/**
 * Récupère la liste des groupes d'un client
 * @returns Promise<ClientGroup[]> - Liste des groupes du client
 */
export const getClientGroups = async (): Promise<ClientGroup[]> => {
  const token = getTokenFromCookies();
  if (!token) throw new Error('Non authentifié');
  
  const user = getUserFromCookies();
  if (!user?.id) throw new Error('Utilisateur non connecté');

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/V1/clientsGroups?clientId=${user.id}`, 
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur ${response.status}: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la récupération des groupes:', error);
    throw error;
  }
};

/**
 * Récupère le nombre de SMS envoyés par le client ce mois-ci
 * @returns Promise<number> - Nombre de SMS envoyés ce mois-ci
 */
export const getSmsCountThisMonth = async (): Promise<number> => {
  const token = getTokenFromCookies();
  if (!token) throw new Error('Non authentifié');
  
  const user = getUserFromCookies();
  if (!user?.id) throw new Error('Utilisateur non connecté');

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  // Fonction utilitaire pour gérer les réponses API
  const handleApiResponse = async <T,>(url: string, res: Response): Promise<T[]> => {
    try {
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`Erreur API (${res.status}) sur ${url}:`, errorText);
        
        // Si c'est une erreur 500, on peut essayer de parser le JSON si possible
        if (res.status === 500) {
          try {
            const errorData = JSON.parse(errorText);
            console.error('Détails de l\'erreur 500:', errorData);
          } catch (e) {
            // Si le parsing échoue, on continue avec le message d'erreur brut
          }
        }
        
        return [];
      }
      
      // Essayer de parser la réponse en JSON
      try {
        return await res.json();
      } catch (e) {
        console.error('Erreur lors du parsing JSON de la réponse:', e);
        return [];
      }
    } catch (error) {
      console.error(`Erreur lors du traitement de la réponse de ${url}:`, error);
      return [];
    }
  };

  try {
    console.log('Récupération des statistiques SMS...');
    
    // Récupérer les SMS des 3 types avec gestion d'erreur individuelle
    const [unides, muldes, muldesp] = await Promise.allSettled([
      fetch(`${API_BASE_URL}/api/V1/sms/unides/${user.id}`, { headers })
        .then(res => handleApiResponse<MessageUnides>(`unides`, res)),
      
      fetch(`${API_BASE_URL}/api/V1/sms/muldes/${user.id}`, { headers })
        .then(res => handleApiResponse<MessageMuldes>(`muldes`, res)),
      
      fetch(`${API_BASE_URL}/api/V1/sms/muldesp/${user.id}`, { headers })
        .then(res => handleApiResponse<MessageMuldes>(`muldesp`, res))
    ]).then(results => 
      results.map(result => 
        result.status === 'fulfilled' ? result.value : []
      )
    ) as [MessageUnides[], MessageMuldes[], MessageMuldes[]];
    
    console.log('Données brutes récupérées:', { unides, muldes, muldesp });

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Fonction pour vérifier si une date est dans le mois en cours
    const isThisMonth = (dateString: string) => {
      const date = new Date(dateString);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    };

    // Compter les SMS unides du mois
    const unidesCount = unides
      .filter(sms => sms.statut === 'ENVOYE' && isThisMonth(sms.createdAt))
      .length;

    // Compter les SMS muldes du mois (en comptant les destinataires)
    const muldesCount = muldes
      .filter(sms => sms.statut === 'ENVOYE' && isThisMonth(sms.createdAt))
      .reduce((sum, sms) => sum + sms.Destinataires.length, 0);

    // Compter les SMS muldesp du mois (en comptant les destinataires)
    const muldespCount = muldesp
      .filter(sms => sms.statut === 'ENVOYE' && isThisMonth(sms.createdAt))
      .reduce((sum, sms) => sum + sms.Destinataires.length, 0);

    return unidesCount + muldesCount + muldespCount;
  } catch (error) {
    const apiError = error as ApiError;
    console.error('Erreur lors du comptage des SMS:', {
      message: apiError.message,
      status: apiError.status,
      data: apiError.data
    });
    // Retourner 0 au lieu de lancer une erreur pour ne pas bloquer l'interface
    return 0;
  }
};

export const fetchMessages = async (
  type: 'unides' | 'muldes' | 'muldesp', 
  page: number = 1, 
  pageSize: number = 5
): Promise<ApiResponse> => {
  const token = getTokenFromCookies();
  if (!token) throw new Error('Non authentifié');
  
  // Récupérer l'utilisateur connecté
  const user = getUserFromCookies();
  if (!user || !user.id) throw new Error('Utilisateur non connecté');
  
  // Construire l'URL en fonction du type de message
  let url: string;
  
  switch (type) {
    case 'unides':
      url = `${API_BASE_URL}/api/V1/sms/unides/${user.id}`;
      break;
    case 'muldes':
      url = `${API_BASE_URL}/api/V1/sms/muldes/${user.id}`;
      break;
    case 'muldesp':
      url = `${API_BASE_URL}/api/V1/sms/muldesp/${user.id}`;
      break;
    default:
      throw new Error(`Type de message non supporté: ${type}`);
  }
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des messages');
  }

  const data = await response.json();
  
  // Implémentation de la pagination côté client
  const startIndex = (page - 1) * pageSize;
  const paginatedData = data.slice(startIndex, startIndex + pageSize);
  
  return {
    data: paginatedData,
    total: data.length,
    page,
    pageSize,
    totalPages: Math.ceil(data.length / pageSize),
  };
};
