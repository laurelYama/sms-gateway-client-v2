import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { getTokenFromCookies } from '@/lib/auth';

import { API_CONFIG } from '@/lib/config';

// Configuration de base pour l'API
console.log('Configuration de l\'API avec l\'URL de base:', API_CONFIG.BASE_URL);

// Configuration de l'instance Axios

// Fonction utilitaire pour logger les requêtes
const logRequest = (config: any) => {
  console.log(`[${config.method?.toUpperCase()}] ${config.url}`, {
    baseURL: config.baseURL,
    headers: config.headers,
    data: config.data,
  });
  return config;
};

// Fonction utilitaire pour logger les réponses
const logResponse = (response: any) => {
  console.log(`[${response.status}] ${response.config.url}`, {
    data: response.data,
    headers: response.headers,
  });
  return response;
};

// Fonction utilitaire pour logger les erreurs et formater les messages d'erreur
const handleApiError = (error: any) => {
  const requestId = error.config?.headers?.['X-Request-ID'] || '?';
  const url = error.config?.url || 'URL inconnue';
  const method = error.config?.method?.toUpperCase() || 'METHODE INCONNUE';
  
  let errorMessage = 'Une erreur inattendue est survenue';
  let errorDetails: any = { requestId, url, method };
  
  if (error.response) {
    // Erreur de l'API (4xx, 5xx)
    const { status, data, headers } = error.response;
    
    errorDetails = {
      ...errorDetails,
      status,
      statusText: error.response.statusText,
      data,
      headers: headers ? JSON.parse(JSON.stringify(headers)) : undefined,
    };
    
    // Messages d'erreur personnalisés selon le code d'erreur
    switch (status) {
      case 400:
        errorMessage = 'Requête incorrecte';
        if (data?.message) errorMessage += `: ${data.message}`;
        break;
      case 401:
        errorMessage = 'Non autorisé. Veuillez vous reconnecter.';
        break;
      case 403:
        errorMessage = 'Accès refusé. Vous n\'avez pas les droits nécessaires.';
        break;
      case 404:
        errorMessage = 'Ressource non trouvée';
        break;
      case 500:
        errorMessage = 'Erreur interne du serveur';
        if (data?.error) errorMessage += `: ${data.error}`;
        break;
      default:
        errorMessage = `Erreur serveur (${status})`;
    }
  } else if (error.request) {
    // Pas de réponse du serveur
    errorMessage = 'Le serveur ne répond pas. Vérifiez votre connexion internet.';
    errorDetails = { ...errorDetails, message: error.message };
  } else {
    // Erreur de configuration
    errorMessage = 'Erreur de configuration de la requête';
    errorDetails = { ...errorDetails, message: error.message };
  }
  
  // Journalisation détaillée en mode développement
  if (process.env.NODE_ENV === 'development') {
    console.error(`[API] Erreur [${requestId}]: ${errorMessage}`, errorDetails);
  } else {
    console.error(`[API] Erreur [${requestId}]: ${errorMessage}`);
  }
  
  // Création d'une erreur avec des détails étendus
  const apiError = new Error(errorMessage) as any;
  apiError.isApiError = true;
  apiError.details = errorDetails;
  
  return Promise.reject(apiError);
};

// Création d'une instance axios avec la configuration de base
const apiClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: 15000, // 15 secondes de timeout
  withCredentials: true, // Important pour envoyer les cookies avec les requêtes cross-origin
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Configuration des intercepteurs
apiClient.interceptors.request.use(
  (config) => {
    // Ne pas ajouter le token pour les requêtes de login
    if (config.url?.includes('/auth/login')) {
      console.log('[API] Requête de login détectée, pas de token nécessaire');
      return config;
    }

    // Récupérer le token depuis les cookies
    const token = getTokenFromCookies();
    
    if (!token) {
      console.warn('[API] Aucun token trouvé pour la requête vers:', config.url);
      console.log('[API] Cookies actuels:', document.cookie);
      // Ne pas rediriger ici, laisser le middleware gérer l'authentification
      return Promise.reject(new Error('Non authentifié'));
    }
    
    // Ajouter le token d'authentification
    config.headers = config.headers || {};
    
    // S'assurer que les en-têtes sont en minuscules pour la compatibilité
    const normalizedHeaders: Record<string, string> = {};
    Object.entries(config.headers).forEach(([key, value]) => {
      normalizedHeaders[key.toLowerCase()] = value;
    });
    
    // Définir les en-têtes nécessaires
    normalizedHeaders['authorization'] = `Bearer ${token}`;
    normalizedHeaders['accept'] = 'application/json';
    normalizedHeaders['content-type'] = 'application/json';
    
    // Ajouter un identifiant de requête unique pour le débogage
    const requestId = Math.random().toString(36).substring(2, 9);
    normalizedHeaders['x-request-id'] = requestId;
    
    // Mettre à jour les en-têtes de la requête
    config.headers = normalizedHeaders;
    
    // Forcer l'envoi des cookies avec la requête
    config.withCredentials = true;
    
    console.log(`[API] Préparation de la requête [${requestId}]:`, {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      headers: config.headers,
      withCredentials: config.withCredentials,
      data: config.data
    });
    
    return config;
  },
  (error) => {
    console.error('[API] Erreur dans l\'intercepteur de requête:', error);
    return Promise.reject(error);
  }
);

// Configuration de l'intercepteur de réponse
apiClient.interceptors.response.use(
  (response) => {
    const requestId = response.config.headers?.['x-request-id'] || '?';
    console.log(`[API] Réponse [${requestId}]: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    const requestId = error.config?.headers?.['x-request-id'] || '?';
    const status = error.response?.status;
    
    // Gestion spécifique des erreurs 401 (Non autorisé)
    if (status === 401) {
      console.warn(`[API] Session expirée ou non authentifiée pour la requête [${requestId}]`);
      return Promise.reject(new Error('Session expirée'));
    }
    
    // Personnaliser le message d'erreur en fonction du code de statut
    let errorMessage = 'Une erreur est survenue';
    
    if (status) {
      switch (status) {
        case 400:
          errorMessage = 'Requête invalide. Veuillez vérifier les données saisies.';
          if (error.response?.data?.message) {
            errorMessage += `: ${error.response.data.message}`;
          }
          break;
        case 401:
          errorMessage = 'Non autorisé. Veuillez vous reconnecter.';
          break;
        case 403:
          errorMessage = 'Vous n\'avez pas les permissions nécessaires pour effectuer cette action.';
          break;
        case 404:
          errorMessage = 'La ressource demandée est introuvable.';
          break;
        case 500:
          errorMessage = 'Une erreur interne du serveur est survenue. Veuillez réessayer plus tard.';
          if (error.response?.data?.error) {
            errorMessage += `: ${error.response.data.error}`;
          }
          break;
        default:
          errorMessage = `Erreur serveur (${status})`;
      }
      
      // Créer une nouvelle erreur avec le message personnalisé
      const apiError = new Error(errorMessage) as any;
      apiError.status = status;
      apiError.response = error.response;
      
      // Journalisation détaillée en mode développement
      if (process.env.NODE_ENV === 'development') {
        console.error(`[API] Erreur [${requestId}]: ${status} - ${errorMessage}`, {
          url: error.config?.url,
          method: error.config?.method?.toUpperCase(),
          response: error.response?.data,
          headers: error.response?.headers
        });
      }
      
      return Promise.reject(apiError);
    }
    
    // Si on n'a pas pu déterminer le type d'erreur
    console.error(`[API] Erreur inconnue [${requestId}]:`, error);
    
    // Gestion des erreurs réseau ou de configuration
    if (error.request) {
      errorMessage = 'Impossible de se connecter au serveur. Vérifiez votre connexion Internet.';
      console.error(`[API] Aucune réponse du serveur pour la requête [${requestId}]:`, error.request);
    } else {
      errorMessage = 'Erreur lors de la préparation de la requête.';
      console.error(`[API] Erreur de configuration pour la requête [${requestId}]:`, error.message);
    }
    
    return Promise.reject(new Error(errorMessage));
  }
);

// Interface pour les informations du client
export interface ClientInfo {
  idclients: string;
  raisonSociale: string;
  secteurActivite: string;
  ville: string;
  adresse: string;
  telephone: string;
  email: string;
  nif: string;
  rccm: string;
  emetteur: string;
  coutSmsTtc: number;
  typeCompte: string;
  role: string;
  soldeNet: number;
  statutCompte: string;
}

/**
 * Récupère les informations d'un client par son ID
 * @param clientId - L'ID du client
 * @returns Les informations du client
 */
export const getClientInfo = async (clientId: string): Promise<ClientInfo> => {
  try {
    const response = await apiClient.get<ClientInfo>(`/clients/${clientId}`);
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération des informations du client:', error);
    throw error;
  }
};

// Export de l'instance du client API
export default apiClient;
