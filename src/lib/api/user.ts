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
    if (response.status === 401) {
      window.location.href = '/login';
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Erreur lors de la récupération du profil');
  }

  return response.json();
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
