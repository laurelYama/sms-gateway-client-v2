import Cookies from 'js-cookie';

export interface ChangePasswordData {
  oldPassword: string;
  newPassword: string;
}

export async function changePassword(data: ChangePasswordData): Promise<{ message: string }> {
  const token = Cookies.get('authToken');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const clientId = user?.clientId || '700010';
  
  console.log('Token:', token ? 'Présent' : 'Manquant');
  console.log('Client ID:', clientId);
  
  if (!token) {
    throw new Error('Aucun token d\'authentification trouvé');
  }

  try {
    const url = `https://api-smsgateway.solutech-one.com/api/V1/clients/${clientId}/password`;
    console.log('URL de l\'API:', url);
    console.log('Données envoyées:', data);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      credentials: 'include' // Important pour les cookies
    });

    console.log('Réponse du serveur - Statut:', response.status);
    const responseData = await response.json().catch(() => ({}));
    console.log('Réponse du serveur - Données:', responseData);

    if (!response.ok) {
      throw new Error(responseData.message || `Erreur ${response.status} lors du changement de mot de passe`);
    }

    return responseData;
  } catch (error) {
    console.error('Erreur lors du changement de mot de passe:', error);
    throw error;
  }
}
