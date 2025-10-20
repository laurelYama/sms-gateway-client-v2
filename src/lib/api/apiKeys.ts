import { getClientId } from '@/lib/utils/clientUtils';
import Cookies from 'js-cookie';
import { API_ENDPOINTS } from '@/config/api';

export interface ApiKeyData {
  clientId: string;
  apiKey: string;
  expiresAt?: string;
  message?: string;
}

export async function fetchApiKey(): Promise<ApiKeyData> {
  const clientId = getClientId();
  if (!clientId) {
    throw new Error('Impossible de récupérer l\'ID du client. Veuillez vous reconnecter.');
  }
  
  const token = Cookies.get('authToken');
  if (!token) {
    throw new Error('Aucun token d\'authentification trouvé');
  }

  const response = await fetch(`https://api-smsgateway.solutech-one.com/api/V1/clients/${clientId}/apikey`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Erreur lors de la récupération de la clé API');
  }

  return response.json();
}

export async function regenerateApiKey(): Promise<ApiKeyData> {
  try {
    const clientId = getClientId();
    if (!clientId) {
      throw new Error('Impossible de régénérer la clé API: ID client non trouvé');
    }
    
    const token = Cookies.get('authToken');
    if (!token) {
      console.error('Aucun token d\'authentification trouvé');
      window.location.href = '/login';
      throw new Error('Session expirée. Veuillez vous reconnecter.');
    }

    console.log('Tentative de régénération de la clé API...');
    
  const url = API_ENDPOINTS.CLIENTS.REGENERATE_API_KEY(clientId);
    console.log('URL de la requête:', url);
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({}) // Corps vide car l'API ne nécessite pas de données
    });
    
    // Afficher les informations de base de la réponse
    console.log('Statut de la réponse:', response.status, response.statusText);
    
    let responseData;
    try {
      responseData = await response.text();
      console.log('Réponse brute:', responseData);
      responseData = responseData ? JSON.parse(responseData) : {};
    } catch (e) {
      console.error('Erreur lors du parsing de la réponse:', e);
      throw new Error('Réponse du serveur invalide');
    }
    
    if (!response.ok) {
      console.error('Erreur de l\'API:', {
        status: response.status,
        statusText: response.statusText,
        data: responseData
      });
      
      if (response.status === 401) {
        window.location.href = '/login';
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }
      
      const errorMessage = responseData?.message || responseData?.error || 
                         `Erreur du serveur (${response.status} ${response.statusText})`;
      
      throw new Error(errorMessage);
    }
    
    if (!responseData || typeof responseData !== 'object') {
      throw new Error('Format de réponse inattendu du serveur');
    }
    
    // Mettre à jour les données avec la nouvelle clé
    return {
      clientId: clientId,
      apiKey: responseData.newApiKey || '',
      expiresAt: responseData.expiresAt,
      message: responseData.message
    };
  } catch (error) {
    console.error('Erreur dans regenerateApiKey:', error);
    throw error instanceof Error 
      ? error 
      : new Error('Une erreur inattendue est survenue lors de la régénération de la clé API');
  }
}
