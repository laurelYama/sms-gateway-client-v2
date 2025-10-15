import { getTokenFromCookies } from '@/lib/auth';

const API_URL = 'https://api-smsgateway.solutech-one.com/api/V1/clientsGroups';

export interface Groupe {
  idClientsGroups: string;
  nomGroupe: string;
  descriptionGroupe: string;
  createdAt: string;
  updatedAt: string;
  clientId?: string; // Pour la création/mise à jour
}

export async function getGroupes(clientId: string): Promise<Groupe[]> {
  try {
    console.log('[DEBUG] getGroupes - clientId:', clientId);
    
    if (!clientId) {
      throw new Error('ID client manquant pour la récupération des groupes');
    }
    
    const token = getTokenFromCookies();
    if (!token) {
      throw new Error('Token d\'authentification manquant');
    }
    
    const url = `${API_URL}?clientId=${encodeURIComponent(clientId)}`;
    console.log('[DEBUG] getGroupes - URL:', url);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    
    console.log('[DEBUG] getGroupes - Statut de la réponse:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ERROR] getGroupes - Erreur de l\'API:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        error: errorText
      });
      
      if (response.status === 401) {
        // Nettoyage en cas d'erreur d'authentification
        localStorage.removeItem('user');
        document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        window.location.href = '/login';
      }
      
      throw new Error(`Erreur ${response.status}: ${response.statusText || 'Erreur lors de la récupération des groupes'}`);
    }
    
    const data = await response.json();
    console.log('[DEBUG] getGroupes - Données reçues:', data);
    return data;
  } catch (error) {
    console.error('[ERROR] getGroupes - Erreur:', error);
    throw error;
  }
}

export async function getGroupeById(id: string): Promise<Groupe> {
  const token = getTokenFromCookies();
  const response = await fetch(`${API_URL}/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error('Groupe non trouvé');
  }
  
  return response.json();
}

export async function createGroupe(groupeData: {
  clientId: string;
  nom: string;
  description: string;
}): Promise<Groupe> {
  const token = getTokenFromCookies();
  const response = await fetch(`${API_URL}/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      clientId: groupeData.clientId,
      nom: groupeData.nom,
      description: groupeData.description,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erreur lors de la création du groupe');
  }

  return response.json();
}

export async function updateGroupe(id: string, groupeData: {
  clientId: string;
  nom: string;
  description: string;
}): Promise<Groupe> {
  const token = getTokenFromCookies();
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      nom: groupeData.nom,
      description: groupeData.description,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erreur lors de la mise à jour du groupe');
  }

  return response.json();
}

export async function deleteGroupe(id: string): Promise<void> {
  const token = getTokenFromCookies();
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Erreur lors de la suppression du groupe');
  }
}
