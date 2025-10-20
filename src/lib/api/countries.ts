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

// Aucune donnée de secours - on compte sur l'API
const FALLBACK_COUNTRIES: CountryCode[] = [];

export async function fetchCountryCodes(): Promise<CountryCode[]> {
  // Gestion des erreurs
  const handleError = (message: string, error?: any) => {
    console.error(message, error || '');
    return [];
  };

  try {
    // Vérifier si on est côté navigateur
    if (typeof window === 'undefined') {
      console.warn('fetchCountryCodes appelé côté serveur - retourne une liste vide');
      return [];
    }

    // Récupérer le token d'authentification depuis les cookies
    const token = Cookies.get('authToken');
    
    if (!token) {
      return handleError('Aucun token d\'authentification trouvé, utilisation des données de secours');
    }

    // Vérifier que l'URL de base est définie
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api-smsgateway.solutech-one.com';
    const endpoint = `${apiUrl}/api/V1/referentiel/categorie/004`;
    
    if (!endpoint) {
      return handleError('URL du endpoint des pays non définie');
    }
    
    console.log('Tentative de récupération des pays depuis:', endpoint);
    
    let response;
    try {
      response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        // Désactiver le cache pour éviter les problèmes de mise en cache
        cache: 'no-store',
      });
    } catch (networkError) {
      return handleError('Erreur réseau lors de la récupération des pays:', networkError);
    }

    // Vérifier si la réponse est vide
    if (!response) {
      return handleError('Aucune réponse du serveur');
    }

    // Gérer les erreurs HTTP
    if (!response.ok) {
      // Ne pas essayer de lire le corps de la réponse si la réponse est vide
      if (response.status === 204 || response.status === 404) {
        console.warn('Aucune donnée de pays disponible');
        return [];
      }

      // Rediriger vers la page de connexion si non authentifié
      if (response.status === 401) {
        console.warn('Non authentifié, redirection vers la page de connexion');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return [];
      }

      // Gestion spécifique de l'erreur 500 - pas de log d'erreur pour éviter le bruit dans la console
      if (response.status === 500) {
        return [];
      }

      console.error(`Erreur HTTP ${response.status}: ${response.statusText}`);
      return [];
    }

    // Vérifier le type de contenu
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return handleError('Réponse non-JSON reçue');
    }

    // Lire et parser la réponse
    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      return handleError('Erreur lors de l\'analyse de la réponse JSON:', parseError);
    }
    
    // Vérifier que les données sont un tableau
    if (!Array.isArray(data)) {
      return handleError('Format de réponse inattendu pour les pays');
    }

    // Valider la structure des données
    const isValidData = data.every((item: any) => 
      item && 
      typeof item === 'object' && 
      'refID' in item && 
      'value1' in item && 
      'value2' in item
    );

    if (!isValidData) {
      return handleError('Format de données des pays invalide');
    }
    
    console.log(`${data.length} pays chargés avec succès`);
    return data;
    
  } catch (error) {
    return handleError('Erreur inattendue lors de la récupération des pays:', error);
  }
}
