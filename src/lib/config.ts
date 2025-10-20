// Configuration de base de l'API
export const API_CONFIG = {
  // URL de base de l'API (en production)
  BASE_URL: 'https://api-smsgateway.solutech-one.com/api/V1',
  
  // URL de base du frontend
  FRONTEND_URL: 'http://localhost:3001',
  
  // Définition des endpoints de l'API avec des URLs complètes
  ENDPOINTS: {
    AUTH: 'https://api-smsgateway.solutech-one.com/api/V1/auth',
    LOGIN: 'https://api-smsgateway.solutech-one.com/api/V1/auth/login',
    CREDITS: 'https://api-smsgateway.solutech-one.com/api/V1/credits',
    CREDITS_BALANCE: 'https://api-smsgateway.solutech-one.com/api/V1/credits/balance',
    FORGOT_PASSWORD: 'https://api-smsgateway.solutech-one.com/api/V1/password/forgot',
    RESET_PASSWORD: 'https://api-smsgateway.solutech-one.com/api/V1/password/reset',
  },
  
  // Méthodes utilitaires pour obtenir les URLs complètes
  getAuthUrl: () => API_CONFIG.ENDPOINTS.AUTH,
  getLoginUrl: () => API_CONFIG.ENDPOINTS.LOGIN,
  getCreditsUrl: () => API_CONFIG.ENDPOINTS.CREDITS,
  getCreditsBalanceUrl: () => API_CONFIG.ENDPOINTS.CREDITS_BALANCE,
  getForgotPasswordUrl: () => API_CONFIG.ENDPOINTS.FORGOT_PASSWORD,
  getResetPasswordUrl: () => API_CONFIG.ENDPOINTS.RESET_PASSWORD,
  
  // URL du frontend
  getFrontendResetPasswordUrl: (token: string) => 
    `${API_CONFIG.FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`,
} as const;
