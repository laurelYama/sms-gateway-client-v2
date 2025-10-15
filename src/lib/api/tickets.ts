import Cookies from 'js-cookie';

export interface Ticket {
  id: string;
  clientId: string;
  emailClient: string;
  titre: string;
  description: string;
  statut: 'OUVERT' | 'EN_COURS' | 'FERME';
  reponseAdmin: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTicketData {
  titre: string;
  description: string;
  clientId: string;
  emailClient: string;
}

export async function fetchTickets(clientId: string): Promise<Ticket[]> {
  const token = Cookies.get('authToken');
  
  if (!token) {
    throw new Error('Aucun token d\'authentification trouvé');
  }

  const response = await fetch(`https://api-smsgateway.solutech-one.com/api/V1/tickets/client/${clientId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Erreur lors de la récupération des tickets');
  }

  return response.json();
}

export async function createTicket(ticketData: CreateTicketData): Promise<Ticket> {
  const token = Cookies.get('authToken');
  
  if (!token) {
    throw new Error('Aucun token d\'authentification trouvé');
  }

  const response = await fetch('https://api-smsgateway.solutech-one.com/api/V1/tickets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(ticketData),
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Erreur lors de la création du ticket');
  }

  return response.json();
}
