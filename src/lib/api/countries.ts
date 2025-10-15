import Cookies from 'js-cookie';
import { API_ENDPOINTS } from '@/config/api';

export interface CountryCode {
  refID: number;
  value1: string;   // Nom du pays (ex: "France")
  value2: string;   // Indicatif (ex: "+33")
  value3: null;
  value4: null;
  refCategory: string;
}

export async function fetchCountryCodes(): Promise<CountryCode[]> {
  try {
    // Récupérer le token d'authentification depuis les cookies
    const token = Cookies.get('authToken');
    
    if (!token) {
      throw new Error('Aucun token d\'authentification trouvé');
    }

    const response = await fetch(API_ENDPOINTS.COUNTRIES, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Déconnexion si le token est invalide ou expiré
        window.location.href = '/login';
      }
      throw new Error(`Erreur ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Erreur API:', error);
    // Si c'est une erreur d'authentification, rediriger vers la page de connexion
    if (error instanceof Error && error.message.includes('401')) {
      window.location.href = '/login';
    }
    throw error;
}
