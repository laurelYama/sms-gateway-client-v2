import { useState, useEffect } from 'react';
import { getTokenFromCookies } from '@/lib/auth';

export interface ClientInfo {
  idclients: string;
  typeCompte: string;
  raisonSociale: string;
  // Autres champs disponibles dans la réponse API
}

function getClientIdFromCookies(): string | null {
  if (typeof window === 'undefined') return null;
  
  // Essayer de récupérer depuis les cookies
  const match = document.cookie.match(/user=([^;]+)/);
  if (match && match[1]) {
    try {
      const user = JSON.parse(decodeURIComponent(match[1]));
      return user?.id || null;
    } catch (e) {
      console.error('Erreur lors du parsing du cookie user:', e);
      return null;
    }
  }
  return null;
}

export function useClientInfo() {
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchClientInfo = async () => {
      try {
        console.log('[useClientInfo] Début de la récupération des informations du client');
        const token = getTokenFromCookies();
        const clientId = getClientIdFromCookies();
        
        if (!token) {
          console.error('[useClientInfo] Aucun token trouvé dans les cookies');
          throw new Error('Non authentifié');
        }

        if (!clientId) {
          throw new Error('ID client non trouvé dans les cookies');
        }

        console.log('[useClientInfo] Token et ID client trouvés, appel de l\'API...');
        const response = await fetch(`https://api-smsgateway.solutech-one.com/api/V1/clients/${clientId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Important pour les cookies d'authentification
        });

        console.log(`[useClientInfo] Réponse reçue: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[useClientInfo] Erreur API:', {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            body: errorText
          });
          
          if (response.status === 401) {
            // Rediriger vers la page de connexion si non authentifié
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
            return;
          }
          
          throw new Error(`Erreur ${response.status}: ${response.statusText}. ${errorText}`);
        }

        const data = await response.json();
        console.log('[useClientInfo] Données reçues:', data);
        setClientInfo(data);
      } catch (err) {
        console.error('[useClientInfo] Erreur:', err);
        setError(err instanceof Error ? err : new Error('Une erreur est survenue lors de la récupération des informations'));
      } finally {
        setLoading(false);
      }
    };

    fetchClientInfo().catch(err => {
      console.error('[useClientInfo] Erreur non gérée dans fetchClientInfo:', err);
      setError(err instanceof Error ? err : new Error('Erreur inattendue'));
      setLoading(false);
    });
  }, []);

  return { clientInfo, loading, error };
}
