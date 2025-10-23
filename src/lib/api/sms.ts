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
  destinataires: string[];
  dateDebutEnvoi?: string;
  dateFinEnvoi?: string;
  nbParJour?: number;
  intervalleMinutes?: number;
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
    // Récupérer les SMS des 3 types avec gestion d'erreur individuelle
    const [unidesResult, muldesResult, muldespResult] = await Promise.allSettled([
      fetch(`${API_BASE_URL}/api/V1/sms/unides/${user.id}`, { headers })
        .then(res => handleApiResponse<MessageUnides>(`unides`, res)),
      
      fetch(`${API_BASE_URL}/api/V1/sms/muldes/${user.id}`, { headers })
        .then(res => handleApiResponse<MessageMuldes>(`muldes`, res)),
      
      fetch(`${API_BASE_URL}/api/V1/sms/muldesp/${user.id}`, { headers })
        .then(res => handleApiResponse<MessageMuldes>(`muldesp`, res))
    ]);

    // Vérifier et convertir les résultats
    const unides = unidesResult.status === 'fulfilled' && Array.isArray(unidesResult.value) ? unidesResult.value : [];
    const muldes = muldesResult.status === 'fulfilled' && Array.isArray(muldesResult.value) ? muldesResult.value : [];
    const muldesp = muldespResult.status === 'fulfilled' && Array.isArray(muldespResult.value) ? muldespResult.value : [];

    console.log('Résultats des appels API:', {
      unides: unides.length,
      muldes: muldes.length,
      muldesp: muldesp.length
    });

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Fonction pour vérifier si une date est dans le mois en cours
    const isThisMonth = (dateString: string) => {
      const date = new Date(dateString);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    };

    // Compter les SMS unides du mois
    const unidesCount = Array.isArray(unides) 
      ? unides.filter(sms => sms?.statut === 'ENVOYE' && isThisMonth(sms?.createdAt)).length 
      : 0;

    // Compter les SMS muldes du mois (en comptant les destinataires)
    const muldesCount = Array.isArray(muldes)
      ? muldes
          .filter(sms => sms?.statut === 'ENVOYE' && isThisMonth(sms?.createdAt))
          .reduce((sum, sms) => {
            const destinataires = sms?.Destinataires || [];
            return sum + (Array.isArray(destinataires) ? destinataires.length : 0);
          }, 0)
      : 0;

    // Compter les SMS muldesp du mois (en comptant les destinataires)
    const muldespCount = Array.isArray(muldesp)
      ? muldesp
          .filter(sms => sms?.statut === 'ENVOYE' && isThisMonth(sms?.createdAt))
          .reduce((sum, sms) => {
            const destinataires = sms?.Destinataires || [];
            return sum + (Array.isArray(destinataires) ? destinataires.length : 0);
          }, 0)
      : 0;

    return unidesCount + muldesCount + muldespCount;
  } catch (error) {
    // Gestion améliorée des erreurs
    if (error instanceof Error) {
      console.error('Erreur lors du comptage des SMS:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...(typeof error === 'object' && error !== null ? error : {})
      });
    } else {
      console.error('Erreur inconnue lors du comptage des SMS:', error);
    }
    
    // Retourner 0 au lieu de lancer une erreur pour ne pas bloquer l'interface
    return 0;
  }
};

/**
 * Supprime un message spécifique par sa référence
 * @param messageRef La référence du message à supprimer
 * @returns Promise<boolean> true si la suppression a réussi
 */
export const deleteMessage = async (messageRef: string): Promise<boolean> => {
  const token = getTokenFromCookies();
  if (!token) throw new Error('Non authentifié');
  
  const user = getUserFromCookies();
  if (!user || !user.id) throw new Error('Utilisateur non connecté');
  
  const url = `${API_BASE_URL}/api/sms/client/${user.id}/ref/${encodeURIComponent(messageRef)}`;
  
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: ApiError = new Error(errorData.message || 'Échec de la suppression du message');
    error.status = response.status;
    error.data = errorData;
    throw error;
  }

  return true;
};

/**
 * Supprime tous les messages du client
 * @returns Promise<boolean> true si la suppression a réussi
 */
export const deleteAllMessages = async (): Promise<boolean> => {
  const token = getTokenFromCookies();
  if (!token) throw new Error('Non authentifié');
  
  const user = getUserFromCookies();
  if (!user || !user.id) throw new Error('Utilisateur non connecté');
  
  const url = `${API_BASE_URL}/api/sms/client/${user.id}/all`;
  
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: ApiError = new Error(errorData.message || 'Échec de la suppression des messages');
    error.status = response.status;
    error.data = errorData;
    throw error;
  }

  return true;
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
  let endpoint: string;
  
  if (type === 'muldesp') {
    endpoint = `${API_BASE_URL}/api/V1/sms/client/${user.id}/muldesp/filter`;
  } else if (type === 'muldes') {
    // URL pour les messages groupés
    endpoint = `https://api-smsgateway.solutech-one.com/api/V1/sms/muldes/${user.id}`;
  } else {
    // URL pour les messages simples (unides)
    endpoint = `https://api-smsgateway.solutech-one.com/api/V1/sms/unides/${user.id}`;
  }

  const response = await fetch(endpoint, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `Failed to fetch ${type} messages`
    );
  }

  const data = await response.json();
  
  // Pour les messages programmés (MULDESP), on formate la réponse
  if (type === 'muldesp') {
    // Appliquer la pagination côté client pour les messages programmés
    const startIndex = (page - 1) * pageSize;
    const paginatedData = data.slice(startIndex, startIndex + pageSize);
    
    return {
      data: paginatedData || [],
      total: data?.length || 0,
      page,
      pageSize,
      totalPages: Math.ceil((data?.length || 0) / pageSize)
    };
  }
  
  // Si c'est une réponse paginée ou un tableau direct (cas des MULDESS et UNIDES)
  if ((data.data && Array.isArray(data.data)) || (Array.isArray(data) && (type === 'muldes' || type === 'unides'))) {
    // Pour les messages groupés, formater la réponse pour correspondre à l'interface attendue
    const messages = Array.isArray(data) ? data : data.data;
    const total = Array.isArray(data) ? data.length : data.total;
    
    return {
      data: messages,
      total: total || messages.length,
      page: page,
      pageSize: pageSize,
      totalPages: Math.ceil((total || messages.length) / pageSize)
    };
    return {
      data: data.data,
      total: data.total || data.data.length,
      page: data.page || page,
      pageSize: data.pageSize || pageSize,
      totalPages: data.totalPages || Math.ceil((data.total || data.data.length) / pageSize)
    };
  }
  
  // Si c'est un autre format de réponse
  return {
    data: [],
    total: 0,
    page,
    pageSize,
    totalPages: 0
  };
}

/**
 * Récupère les détails d'un message groupé spécifique
 * @param messageRef La référence du message groupé (ex: 700003)
 * @returns Promise<SmsMuldes> - Les détails du message groupé
 */
export const fetchGroupedMessageDetails = async (messageRef: string): Promise<SmsMuldes> => {
  const token = getTokenFromCookies();
  if (!token) throw new Error('Non authentifié');
  
  const response = await fetch(`https://api-smsgateway.solutech-one.com/api/V1/sms/muldes/${messageRef}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `Échec de la récupération des détails du message groupé`
    );
  }

  const data = await response.json();
  
  // Formater la réponse pour correspondre à l'interface SmsMuldes
  return {
    ref: data.ref || messageRef,
    clientId: data.clientId || '',
    emetteur: data.emetteur || '',
    corps: data.corps || '',
    type: 'MULDES',
    statut: data.statut || 'INCONNU',
    createdAt: data.createdAt || new Date().toISOString(),
    destinataires: data.destinataires || [],
    dateDebutEnvoi: data.dateDebutEnvoi,
    dateFinEnvoi: data.dateFinEnvoi,
    nbParJour: data.nbParJour,
    intervalleMinutes: data.intervalleMinutes
  };
};;
