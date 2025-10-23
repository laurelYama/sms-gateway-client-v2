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
    if (!clientId) {
      throw new Error('ID client requis');
    }
    
    const token = getTokenFromCookies();
    if (!token) {
      throw new Error('Non authentifié');
    }
    
    const url = `${API_URL}?clientId=${encodeURIComponent(clientId)}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    const responseText = await response.text();
    
    if (!response.ok) {
      if (response.status === 401) {
        // Nettoyage en cas d'erreur 401
        localStorage.removeItem('user');
        document.cookie = 'authToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        window.location.href = '/login';
      }
      
      throw new Error(`Erreur ${response.status}: ${response.statusText}`);
    }
    
    try {
      const data = JSON.parse(responseText);
      
      // Vérifier si la réponse est un tableau
      if (Array.isArray(data)) {
        return data;
      }
      
      // Si la réponse est un objet avec une propriété data qui est un tableau
      if (data && Array.isArray(data.data)) {
        return data.data;
      }
      
      // Si la réponse est un objet avec d'autres propriétés
      if (data && typeof data === 'object') {
        return Object.values(data).find(Array.isArray) || [];
      }
      
      return [];
    } catch (parseError) {
      console.error('Erreur lors du parsing de la réponse des groupes');
      return [];
    }
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

export async function deleteGroupe(id: string): Promise<{success: boolean; message?: string}> {
  try {
    const token = getTokenFromCookies();
    if (!token) {
      return { success: false, message: 'Non authentifié' };
    }
    
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      let errorMessage = 'Erreur lors de la suppression du groupe';
      
      if (response.status === 500) {
        errorMessage = 'Impossible de supprimer un groupe contenant des contacts';
        return { success: false, message: errorMessage };
      }
      
      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (e) {
        // Ignorer les erreurs de parsing de la réponse
      }
      
      return { success: false, message: errorMessage };
    }
    
    // Si on arrive ici, la suppression a réussi
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Une erreur inconnue est survenue';
    return { success: false, message };
  }
}
