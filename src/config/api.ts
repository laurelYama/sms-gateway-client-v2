/**
 * Configuration de l'API
 * Contient toutes les URLs de base et les endpoints de l'API
 */

// URL de base de l'API
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api-smsgateway.solutech-one.com';

// Endpoints de l'API
export const API_ENDPOINTS = {
  // Authentification
  AUTH: {
    LOGIN: `${API_BASE_URL}/api/V1/auth/login`,
    REFRESH: `${API_BASE_URL}/api/V1/auth/refresh`,
    PROFILE: `${API_BASE_URL}/api/V1/auth/me`,
  },

  // Contacts
  CONTACTS: `${API_BASE_URL}/api/V1/contacts`,
  CONTACTS_BY_CLIENT: (clientId: string) => `${API_BASE_URL}/api/V1/contacts/client/${clientId}`,
  CONTACTS_BY_GROUP: (clientId: string, groupId: string) => 
    `${API_BASE_URL}/api/V1/contacts/client/${clientId}?groupId=${encodeURIComponent(groupId)}`,
  CONTACTS_COUNT_BY_GROUP: (clientId: string, groupId: string) =>
    `${API_BASE_URL}/api/V1/contacts/client/${clientId}/count?groupId=${encodeURIComponent(groupId)}`,
  
  // Groupes
  GROUPS: `${API_BASE_URL}/api/V1/clientsGroups`,
  GROUP_CONTACTS: (groupId: string) => `${API_BASE_URL}/api/V1/clientsGroups/${groupId}/contacts`,
  
  // SMS
  SMS: {
    BASE: `${API_BASE_URL}/api/V1/sms`,
    UNIDES: `${API_BASE_URL}/api/V1/sms/unides`,
    MULTIPLES: `${API_BASE_URL}/api/V1/sms/muldes`,
    PROGRAMMES: `${API_BASE_URL}/api/V1/sms/muldesp`,
    STATS: (clientId: string) => `${API_BASE_URL}/api/V1/sms/stats/client/${clientId}`,
  },
  
  // Facturation
  BILLING: {
    BASE: `${API_BASE_URL}/api/V1/billing`,
    INVOICES: (clientId: string) => `${API_BASE_URL}/api/V1/billing/factures/client/${clientId}`,
    INVOICE_PDF: (invoiceId: string) => `${API_BASE_URL}/api/V1/billing/factures/${invoiceId}/pdf`,
    BILLING_CALENDAR: (year: number) => `${API_BASE_URL}/api/V1/billing/calendrier-facturation/${year}`,
  },
  
  // Clients
  CLIENTS: {
    BASE: `${API_BASE_URL}/api/V1/clients`,
    BALANCE: (clientId: string) => `${API_BASE_URL}/api/V1/clients/${clientId}/solde-net`,
    API_KEYS: (clientId: string) => `${API_BASE_URL}/api/V1/clients/${clientId}/apikey`,
    REGENERATE_API_KEY: (clientId: string) => `${API_BASE_URL}/api/V1/clients/${clientId}/regenerate-api-key`,
  },
  
  // Référentiels
  REFERENTIEL: {
    COUNTRIES: `${API_BASE_URL}/api/V1/referentiel/categorie/004`,
  },
  
  // Émetteurs
  EMETTEURS: {
    BASE: `${API_BASE_URL}/api/V1/emetteurs`,
    BY_CLIENT: (clientId: string) => `${API_BASE_URL}/api/V1/emetteurs/client/${clientId}`,
  },
  
  // Tickets
  TICKETS: {
    BASE: (clientId: string) => `${API_BASE_URL}/api/V1/tickets/client/${clientId}`,
    BY_ID: (ticketId: string) => `${API_BASE_URL}/api/V1/tickets/${ticketId}`,
    MESSAGES: (ticketId: string) => `${API_BASE_URL}/api/V1/tickets/${ticketId}/messages`,
  },
  
  // Crédits
  CREDITS: {
    BASE: (clientId: string) => `${API_BASE_URL}/api/V1/credits?clientId=${clientId}`,
    TRANSACTIONS: (clientId: string) => `${API_BASE_URL}/api/V1/credits/transactions/client/${clientId}`,
  },
  
  // Utilisateurs
  USERS: {
    PROFILE: `${API_BASE_URL}/api/V1/users/me`,
    UPDATE_PROFILE: `${API_BASE_URL}/api/V1/users/profile`,
    CHANGE_PASSWORD: `${API_BASE_URL}/api/V1/users/change-password`,
  },
} as const;

// Fonction utilitaire pour construire les en-têtes d'authentification
export const getAuthHeaders = (token: string) => ({
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
});
