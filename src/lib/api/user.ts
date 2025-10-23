import Cookies from 'js-cookie';

export interface UserProfile {
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
  typeCompte: 'PREPAYE' | 'POSTPAYE';
  role: string;
  soldeNet: number;
  statutCompte: string;
}

export interface UpdateProfileData {
  raisonSociale: string;
  secteurActivite: string;
  ville: string;
  adresse: string;
  telephone: string;
  email: string;
  emetteur: string;
}

export async function fetchUserProfile(clientId: string): Promise<UserProfile> {
  const token = Cookies.get('authToken');
  
  if (!token) {
    throw new Error('Aucun token d\'authentification trouvé');
  }

  const response = await fetch(`https://api-smsgateway.solutech-one.com/api/V1/clients/${clientId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
    credentials: 'include',
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    
    if (response.status === 401) {
      window.location.href = '/login';
      throw new Error('Session expirée');
    }
    
    let errorMessage = 'Erreur lors de la récupération du profil';
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.message || errorMessage;
    } catch {
      // En cas d'erreur de parsing, on garde le message d'erreur par défaut
    }
    
    throw new Error(errorMessage);
  }

  try {
    return await response.json();
  } catch {
    throw new Error('Erreur lors de la lecture des données du profil');
  }
}

export async function updateUserProfile(clientId: string, data: UpdateProfileData): Promise<UserProfile> {
  const token = Cookies.get('authToken');
  
  if (!token) {
    throw new Error('Aucun token d\'authentification trouvé');
  }

  const response = await fetch(`https://api-smsgateway.solutech-one.com/api/V1/clients/${clientId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(data),
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Erreur lors de la mise à jour du profil');
  }

  return response.json();
}
