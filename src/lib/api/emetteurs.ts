import Cookies from 'js-cookie';
import { getClientId } from '@/lib/utils/clientUtils';
import { API_ENDPOINTS } from '@/config/api';

export interface Emetteur {
  id: string;
  nom: string;
  client: {
    idclients: string;
    raisonSociale: string;
  };
  createdAt: string;
  updatedAt?: string;
}

export async function fetchEmetteurs(): Promise<Emetteur[]> {
  try {
    const token = Cookies.get('authToken');
    if (!token) {
      throw new Error('Aucun token d\'authentification trouvé');
    }

    // Récupération de l'ID client de manière sécurisée
    const clientId = getClientId();
    
    if (!clientId) {
      throw new Error('ID client non trouvé. Veuillez vous reconnecter.');
    }
    
    const url = `https://api-smsgateway.solutech-one.com/api/V1/emetteurs/client/${clientId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      if (response.status === 401) {
        // Nettoyage en cas d'erreur 401
        localStorage.removeItem('user');
        Cookies.remove('authToken');
        // Ne pas rediriger ici, laisser le composant gérer la redirection
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }
      
      console.error('Erreur de réponse:', response.status, response.statusText, responseText);
      throw new Error(`Erreur ${response.status}: ${response.statusText}`);
    }

    try {
      // Essayer de parser la réponse en JSON
      const data = JSON.parse(responseText) as Emetteur[];
      return data;
    } catch (parseError) {
      console.error('Erreur lors du parsing de la réponse JSON:', parseError);
      console.error('Contenu de la réponse:', responseText);
      // Retourner un tableau vide au lieu de planter l'application
      return [];
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des émetteurs:', error);
    if (error instanceof Error && error.message.includes('401')) {
      window.location.href = '/login';
    }
    throw error;
  }
}

export async function createEmetteur(emetteurData: { nom: string }): Promise<Emetteur> {
  // Récupérer l'ID client de manière sécurisée
  const clientId = getClientId();
  console.log('[DEBUG] Création d\'un émetteur avec clientId:', clientId);
  
  if (!clientId) {
    throw new Error('ID client non trouvé. Veuillez vous reconnecter.');
  }
  
  try {
    const token = Cookies.get('authToken');
    
    if (!token) {
      throw new Error('Aucun token d\'authentification trouvé');
    }

    const requestData = {
      ...emetteurData,
      clientId
    };

    console.log('[DEBUG] Données de la requête createEmetteur:', {
      url: 'https://api-smsgateway.solutech-one.com/api/V1/emetteurs',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.substring(0, 10)}...`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: requestData
    });

    const response = await fetch('https://api-smsgateway.solutech-one.com/api/V1/emetteurs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      let errorMessage = `Erreur HTTP ${response.status} - ${response.statusText}`;
      let responseText = '';
      
      try {
        // Essayer de lire le texte de la réponse
        responseText = await response.text();
        console.error('[DEBUG] Corps de la réponse (texte):', responseText);
        
        // Essayer de parser en JSON si possible
        try {
          if (responseText) {
            const errorData = JSON.parse(responseText);
            console.error('[DEBUG] Réponse d\'erreur de l\'API (JSON):', errorData);
            errorMessage = errorData.message || errorData.error || errorMessage;
          }
        } catch (jsonError) {
          console.error('[DEBUG] La réponse n\'est pas du JSON valide');
          errorMessage = responseText || errorMessage;
        }
      } catch (e) {
        console.error('[DEBUG] Erreur lors de la lecture de la réponse:', e);
      }
      
      // Log détaillé de la requête qui a échoué
      console.error('[DEBUG] Détails de la requête échouée:', {
        url: response.url,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseText,
        clientId,
        requestData
      });
      
      // Si c'est une erreur d'authentification, déconnecter l'utilisateur
      if (response.status === 401) {
        localStorage.removeItem('user');
        Cookies.remove('authToken');
        window.location.href = '/login';
      }
      
      throw new Error(errorMessage);
    }

    const responseData = await response.json();
    console.log('[DEBUG] Réponse de l\'API:', responseData);
    return responseData;
  } catch (error) {
    console.error('Erreur lors de la création de l\'émetteur:', error);
    throw error;
  }
}

export async function updateEmetteur(emetteurId: string, nouveauNom: string): Promise<Emetteur> {
  const clientId = getClientId();
  if (!clientId) {
    throw new Error('ID client non trouvé. Veuillez vous reconnecter.');
  }
  
  const token = Cookies.get('authToken');
  if (!token) {
    throw new Error('Aucun token d\'authentification trouvé');
  }

  // Validation du nom
  if (!nouveauNom || nouveauNom.trim().length < 2) {
    throw new Error('Le nom de l\'émetteur doit contenir au moins 2 caractères');
  }

  const url = `https://api-smsgateway.solutech-one.com/api/V1/emetteurs/${clientId}/${emetteurId}?nouveauNom=${encodeURIComponent(nouveauNom.trim())}`;
  
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('user');
        Cookies.remove('authToken');
        window.location.href = '/login';
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }
      
      const errorText = await response.text();
      throw new Error(errorText || `Erreur ${response.status}: ${response.statusText}`);
    }

    // Si la réponse est 204 No Content, on construit l'objet localement
    if (response.status === 204) {
      return {
        id: emetteurId,
        nom: nouveauNom.trim(),
        client: {
          idclients: clientId,
          raisonSociale: ''
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    // Pour les autres réponses, on essaie de parser le JSON
    const responseData = await response.json();
    return {
      ...responseData,
      updatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'émetteur:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Une erreur inattendue est survenue');
  }
}

export async function deleteEmetteur(emetteurId: string): Promise<{ message: string }> {
  const clientId = getClientId();
  if (!clientId) {
    throw new Error('ID client non trouvé. Veuillez vous reconnecter.');
  }
  
  const token = Cookies.get('authToken');
  if (!token) {
    throw new Error('Aucun token d\'authentification trouvé');
  }

  try {
    const url = `${API_ENDPOINTS.EMETTEURS.BASE}/${clientId}/${emetteurId}`;
    console.log('[DEBUG] URL de la requête deleteEmetteur:', url);
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Erreur lors de la suppression de l\'émetteur');
    }

    // Si la réponse est vide (statut 204 No Content), on retourne un message de succès
    if (response.status === 204) {
      return { message: 'Émetteur supprimé avec succès' };
    }

    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'émetteur:', error);
    throw error;
  }
}
