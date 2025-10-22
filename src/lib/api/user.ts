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
  console.log('Récupération du token authToken...');
  const token = Cookies.get('authToken');
  
  if (!token) {
    console.error('Aucun token d\'authentification trouvé dans les cookies');
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

  console.log('Réponse de l\'API - Statut:', response.status);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Erreur API - Détails:', errorText);
    
    if (response.status === 401) {
      console.log('Redirection vers la page de connexion...');
      window.location.href = '/login';
    }
    
    let errorMessage = 'Erreur lors de la récupération du profil';
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.message || errorMessage;
    } catch (e) {
      console.error('Erreur lors du parsing de la réponse d\'erreur:', e);
    }
    
    throw new Error(errorMessage);
  }

  try {
    const data = await response.json();
    console.log('Données du profil reçues:', JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('Erreur lors du parsing de la réponse:', error);
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
