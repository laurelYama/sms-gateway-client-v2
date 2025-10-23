import { getTokenFromCookies, getUserFromCookies } from '../auth';

const API_URL = 'https://api-smsgateway.solutech-one.com/api/V1';

export interface Facture {
  id: string;
  clientId: string;
  dateDebut: string;
  dateFin: string;
  consommationSms: number;
  prixUnitaire: number;
  montant: number;
}

export interface CalendrierFacturation {
  id: string;
  mois: number;
  dateDebutConsommation: string;
  dateFinConsommation: string;
  dateGenerationFacture: string;
  exercice: {
    id: string;
    annee: number;
    statut: string;
    createdAt: string;
  };
}

export const getFacturesClient = async (): Promise<Facture[]> => {
  const token = getTokenFromCookies();
  const user = getUserFromCookies();
  
  if (!token || !user?.id) {
    throw new Error('Non authentifié');
  }

  const response = await fetch(`${API_URL}/billing/factures/client/${user.id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des factures');
  }

  return response.json();
};

export const getCalendrierFacturation = async (annee: number): Promise<CalendrierFacturation[]> => {
  console.log('[getCalendrierFacturation] Début - année:', annee);
  const token = getTokenFromCookies();
  
  if (!token) {
    console.error('[getCalendrierFacturation] Erreur d\'authentification: Aucun token trouvé');
    throw new Error('Non authentifié');
  }

  const url = `${API_URL}/billing/exercices/${annee}/calendrier`;
  console.log('[getCalendrierFacturation] Envoi de la requête à:', url);
  console.log('[getCalendrierFacturation] Token:', token ? 'présent' : 'absent');

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    console.log('Réponse reçue - Statut:', response.status, response.statusText);
    
    // Lire la réponse en tant que texte d'abord
    const responseText = await response.text();
    console.log('Réponse brute:', responseText);
    
    if (!response.ok) {
      // Ne pas logger les erreurs 404 pour les années non trouvées (cas normal)
      if (response.status !== 404 && response.status !== 409) {
        console.error('Erreur de l\'API - Détails:', {
          status: response.status,
          statusText: response.statusText,
          url,
          body: responseText || 'Aucun corps de réponse'
        });
      }
      
      let errorMessage = 'Erreur lors de la récupération du calendrier de facturation';
      let errorCode = 'UNKNOWN_ERROR';
      
      if (response.status === 401) {
        errorMessage = 'Session expirée. Veuillez vous reconnecter.';
        errorCode = 'UNAUTHORIZED';
      } else if (response.status === 403) {
        errorMessage = 'Accès refusé. Vous n\'avez pas les droits nécessaires.';
        errorCode = 'FORBIDDEN';
      } else if (response.status === 404) {
        errorMessage = `Aucun calendrier trouvé pour l'année ${annee}.`;
        errorCode = 'YEAR_NOT_FOUND';
      } else if (response.status === 409) {
        errorMessage = `L'année fiscale ${annee} n'est pas encore disponible ou n'est pas ouverte.`;
        errorCode = 'YEAR_NOT_OPEN';
      } else if (response.status >= 500) {
        errorMessage = `Erreur serveur. Veuillez réessayer plus tard.`;
        errorCode = 'SERVER_ERROR';
      }
      
      // Essayer d'extraire un message d'erreur du corps de la réponse si c'est du JSON
      try {
        if (responseText) {
          const errorJson = JSON.parse(responseText);
          if (errorJson && errorJson.message) {
            errorMessage = errorJson.message;
            if (errorJson.code) {
              errorCode = errorJson.code;
            }
          }
        }
      } catch (e) {
        // Ignorer les erreurs de parsing JSON
      }
      
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      (error as any).code = errorCode;
      (error as any).year = annee;
      throw error;
    }
    
    // Si la réponse est vide, retourner un tableau vide
    if (!responseText || responseText.trim() === '') {
      console.warn('La réponse de l\'API est vide');
      return [];
    }
    
    // Parser la réponse JSON
    try {
      const data = JSON.parse(responseText);
      
      // Vérifier si les données sont un tableau
      if (!Array.isArray(data)) {
        console.warn('La réponse de l\'API n\'est pas un tableau:', data);
        return [];
      }
      
      console.log(`Reçu ${data.length} entrées de calendrier`);
      return data;
      
    } catch (parseError) {
      console.error('Erreur lors du parsing de la réponse JSON:', parseError);
      console.error('Réponse brute:', responseText);
      throw new Error('Format de réponse invalide reçu du serveur');
    }
  } catch (error) {
    console.error('Erreur lors de la requête API:', error);
    throw error;
  }
};

export const downloadFacturePdf = async (factureId: string, filename: string): Promise<void> => {
  const token = getTokenFromCookies();
  
  if (!token) {
    throw new Error('Non authentifié');
  }

  try {
    // Télécharger le fichier via fetch avec les en-têtes d'authentification
    const response = await fetch(`${API_URL}/billing/factures/${factureId}/pdf`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }

    // Créer un blob à partir de la réponse
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    
    // Créer un lien pour le téléchargement
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `facture-${factureId}.pdf`;
    document.body.appendChild(a);
    a.click();
    
    // Nettoyer
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
  } catch (error) {
    console.error('Erreur lors du téléchargement de la facture:', error);
    throw new Error('Impossible de télécharger la facture. Veuillez réessayer.');
  }
};
