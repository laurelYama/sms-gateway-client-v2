import apiClient from './client';
import { API_CONFIG } from '@/lib/config';
import { getUserFromCookies } from '../auth';

export interface PurchaseCreditData {
  /**
   * ID du client pour lequel acheter des crédits
   * @example "700002"
   */
  clientId: string;
  
  /**
   * Quantité de crédits à acheter (doit être un nombre)
   * @example 1
   */
  quantity: number | string;
  
  /**
   * Clé d'idempotence pour éviter les doublons de requête
   * @example "9953de7b-c88e-47b1-9c10-379e0ab23aa0"
   */
  idempotencyKey: string;
}

export interface CreditRequest {
  id: string;
  requestCode: string;
  clientId: string;
  quantity: number;
  status: string;
  makerEmail: string | null;
  checkerEmail: string | null;
  idempotencyKey: string | null;
  rejectReason: string | null;
  createdAt: string;
  validatedAt: string | null;
  pricePerSmsTtc: number | null;
  estimatedAmountTtc: number | null;
}

export interface CreditResponse extends CreditRequest {}

export interface CreditHistoryResponse {
  totalPages: number;
  totalElements: number;
  pageable: {
    pageNumber: number;
    pageSize: number;
    sort: {
      sorted: boolean;
      empty: boolean;
      unsorted: boolean;
    };
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  size: number;
  content: CreditRequest[];
  number: number;
  sort: {
    sorted: boolean;
    empty: boolean;
    unsorted: boolean;
  };
  numberOfElements: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

/**
 * Acheter des crédits pour un client
 * @param data Données d'achat de crédits
 * @returns Les informations sur la transaction de crédit
 */
/**
 * Acheter des crédits pour un client
 * @param data Données d'achat de crédits
 * @returns Les informations sur la transaction de crédit
 */
/**
 * Génère un UUID v4 pour l'idempotence
 */
const generateIdempotencyKey = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Acheter des crédits pour un client
 * @param data Données d'achat de crédits
 * @returns Les informations sur la transaction de crédit
 */
export const purchaseCredits = async (data: Omit<PurchaseCreditData, 'idempotencyKey'>): Promise<CreditResponse> => {
  try {
    // Validation des données d'entrée
    if (!data.clientId || data.quantity === undefined || data.quantity === null) {
      throw new Error('Les champs clientId et quantity sont obligatoires');
    }

    // Conversion de la quantité en nombre si nécessaire
    const quantity = typeof data.quantity === 'string' 
      ? parseInt(data.quantity, 10) 
      : data.quantity;

    if (isNaN(quantity) || quantity <= 0) {
      throw new Error('La quantité doit être un nombre positif');
    }

    // Création des données de la requête (sans l'idempotencyKey dans le corps)
    const requestData = {
      clientId: data.clientId,
      quantity: quantity // Assure que c'est un nombre
    };
    
    // Génération de la clé d'idempotence uniquement pour l'en-tête
    const idempotencyKey = generateIdempotencyKey();
    
    console.log('[API] Envoi de la demande d\'achat de crédits:', {
      url: API_CONFIG.getCreditsUrl(),
      method: 'POST',
      data: requestData,
      headers: {
        'Idempotency-Key': idempotencyKey
      }
    });

    try {
      const response = await apiClient.post<CreditResponse>(
        API_CONFIG.ENDPOINTS.CREDITS, 
        requestData, // Corps de la requête sans idempotencyKey
        {
          headers: {
            'Idempotency-Key': idempotencyKey, // Uniquement dans l'en-tête
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 30000 // 30 secondes de timeout
        }
      );
      
      console.log('[API] Réponse de l\'achat de crédits:', response.data);
      return response.data;
    } catch (apiError) {
      console.error('[API] Erreur lors de l\'appel API:', {
        url: API_CONFIG.getCreditsUrl(),
        method: 'POST',
        error: {
          message: apiError.message,
          code: apiError.code,
          response: apiError.response?.data,
          status: apiError.response?.status,
          headers: apiError.response?.headers
        }
      });
      
      // Relancer l'erreur avec un message plus clair
      const errorMessage = apiError.response?.data?.message || 'Erreur lors de l\'achat de crédits';
      const error = new Error(errorMessage);
      (error as any).status = apiError.response?.status;
      (error as any).response = apiError.response?.data;
      throw error;
    }
  } catch (error) {
    console.error('[API] Erreur lors de l\'achat de crédits:', {
      message: error.message,
      stack: error.stack,
      ...(error.response && {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      })
    });
    
    // Si l'erreur n'a pas de statut, c'est une erreur de validation ou autre erreur côté client
    if (!error.status) {
      error.status = 400; // Bad Request
    }
    
    throw error;
  }
};

/**
 * Récupérer l'historique des demandes de crédits
 * @param clientId ID du client
 * @param status Statut des demandes à filtrer (optionnel)
 * @param page Numéro de page (commence à 0)
 * @param size Nombre d'éléments par page
 * @returns L'historique des demandes de crédits
 */
export const getCreditHistory = async (): Promise<CreditRequest[]> => {
  // Récupérer l'utilisateur connecté
  const user = getUserFromCookies();
  if (!user || !user.id) throw new Error('Utilisateur non connecté');
  
  const clientId = user.id;
  try {
    const url = `${API_CONFIG.ENDPOINTS.CREDITS}?clientId=${encodeURIComponent(clientId)}`;
    
    console.log('[API] Récupération de l\'historique des crédits:', {
      url,
      method: 'GET',
      clientId
    });

    const response = await apiClient.get<CreditHistoryResponse>(url);
    console.log('[API] Réponse de l\'historique des crédits:', {
      status: response.status,
      data: response.data
    });
    
    // Retourne directement le tableau des commandes
    return response.data.content || [];
  } catch (error) {
    console.error('[API] Erreur lors de la récupération de l\'historique des crédits:', error);
    throw error;
  }
};

/**
 * Récupérer le solde de crédits du client connecté
 * @returns Le solde de crédits du client
 */
export const getCredits = async (): Promise<{ balance: number }> => {
  try {
    console.log('[API] Récupération du solde de crédits');
    const response = await apiClient.get<{ balance: number }>(API_CONFIG.ENDPOINTS.CREDITS_BALANCE);
    console.log('[API] Solde de crédits récupéré:', response.data);
    return response.data;
  } catch (error) {
    console.error('[API] Erreur lors de la récupération du solde de crédits:', error);
    throw error;
  }
};
