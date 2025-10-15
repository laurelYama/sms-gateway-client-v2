// Configuration de base de l'API
export const API_CONFIG = {
  // URL de base de l'API en production
  BASE_URL: 'https://api-smsgateway.solutech-one.com/api/V1',
  
  // Définition des endpoints de l'API
  ENDPOINTS: {
    AUTH: '/auth',
    LOGIN: '/auth/login',
    CREDITS: '/credits',
    CREDITS_BALANCE: '/credits/balance',
  },
  
  // Méthodes utilitaires pour construire les URLs complètes
  getAuthUrl: () => `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH}`,
  getLoginUrl: () => `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LOGIN}`,
  getCreditsUrl: () => `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CREDITS}`,
  getCreditsBalanceUrl: () => `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CREDITS_BALANCE}`,
} as const;
