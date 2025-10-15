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
  const token = getTokenFromCookies();
  
  if (!token) {
    throw new Error('Non authentifié');
  }

  const response = await fetch(`${API_BASE_URL}/api/V1/billing/exercices/${annee}/calendrier`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Erreur lors de la récupération du calendrier de facturation');
  }

  return response.json();
};

export const downloadFacturePdf = async (factureId: string, filename: string): Promise<void> => {
  const token = getTokenFromCookies();
  
  if (!token) {
    throw new Error('Non authentifié');
  }

  try {
    // Télécharger le fichier via fetch avec les en-têtes d'authentification
    const response = await fetch(`${API_BASE_URL}/api/V1/billing/factures/${factureId}/pdf`, {
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
