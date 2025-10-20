'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { AlertCircle, Send, RefreshCw, Users, User, MessageSquare } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { API_ENDPOINTS } from '@/config/api';
import GroupContactsSelector from '@/components/messages/group-contacts-selector';
import { fetchEmetteurs } from '@/lib/api/emetteurs';

interface ContactInfo {
  number: string;
  countryCode: string;
  fullNumber: string;
  contactName?: string;
}

export default function GroupMessagePage() {
  const [selectedContacts, setSelectedContacts] = useState<ContactInfo[]>([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [emetteurs, setEmetteurs] = useState<Array<{id: string, nom: string}>>([]);
  const [selectedEmetteur, setSelectedEmetteur] = useState('');
  const { toast } = useToast();
  const router = useRouter();
  
  // Charger les émetteurs au montage du composant
  useEffect(() => {
    const loadEmetteurs = async () => {
      try {
        const data = await fetchEmetteurs();
        setEmetteurs(data);
        if (data.length > 0) {
          setSelectedEmetteur(data[0].id);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des émetteurs:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de charger la liste des émetteurs',
          variant: 'destructive',
        });
      }
    };
    
    loadEmetteurs();
  }, [toast]);

  // Gérer la sélection des contacts depuis le sélecteur de groupes
  const handleSelectContacts = (contacts: (string | ContactInfo)[]) => {
    // Filtrer les contacts invalides et normaliser le format
    const validContacts = contacts
      .filter(contact => contact) // Enlever les valeurs null/undefined
      .map(contact => {
        if (typeof contact === 'string') {
          return { 
            fullNumber: contact, 
            countryCode: 'GA',
            contactName: ''
          };
        }
        return {
          fullNumber: contact.fullNumber || '',
          countryCode: contact.countryCode || 'GA',
          contactName: contact.contactName || ''
        };
      })
      .filter(contact => contact.fullNumber); // Ne garder que les contacts avec un numéro valide
      
    setSelectedContacts(validContacts);
  };

  const validatePhoneNumber = (phone: string): boolean => {
    return /^\d{1,15}$/.test(phone);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedContacts.length === 0) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner au moins un destinataire',
        variant: 'destructive',
      });
      return;
    }

    // Vérifier que tous les numéros sont valides
    const invalidNumbers = selectedContacts.filter(contact => !validatePhoneNumber(contact.fullNumber));
    if (invalidNumbers.length > 0) {
      toast({
        title: 'Erreur',
        description: `Certains numéros sont invalides : ${invalidNumbers.map(c => c.fullNumber).join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    if (!message.trim()) {
      toast({
        title: 'Erreur',
        description: 'Veuillez saisir un message',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Récupération du token depuis les cookies
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('authToken='))
        ?.split('=')[1];
        
      if (!token) {
        router.push('/login');
        return;
      }

      const decodedToken = JSON.parse(atob(token.split('.')[1]));
      const clientId = decodedToken?.id || '';

      // Trouver l'émetteur sélectionné
      const emetteurSelectionne = emetteurs.find(e => e.id === selectedEmetteur);
      
      if (!emetteurSelectionne) {
        throw new Error('Émetteur sélectionné introuvable');
      }

      // Préparer les numéros pour l'envoi
      const numeros = selectedContacts.map(contact => {
        if (contact.countryCode) {
          if (contact.countryCode === 'GA' && !contact.fullNumber.startsWith('241')) {
            return `241${contact.fullNumber}`;
          }
          if (contact.countryCode === 'FR' && !contact.fullNumber.startsWith('33')) {
            return `33${contact.fullNumber}`;
          }
        }
        return contact.fullNumber;
      });

      const requestBody = {
        clientId,
        emetteur: emetteurSelectionne.nom,
        numeros,
        corps: message
      };

      console.log('Envoi de la requête avec le body:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(API_ENDPOINTS.SMS.MULTIPLES, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('Réponse reçue - Status:', response.status);
      
      if (!response.ok) {
        console.error('Erreur API - Détails:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
        });
        const errorMessage = await response.text();
        throw new Error(errorMessage);
      }
      
      const responseData = await response.json();
      
      toast({
        title: 'Succès',
        description: `Message envoyé à ${selectedContacts.length} destinataire${selectedContacts.length > 1 ? 's' : ''}`,
        variant: 'default',
      });

      // Réinitialiser après l'envoi
      setSelectedContacts([]);
      setMessage('');
    } catch (error) {
      console.error('Erreur lors de l\'envoi des messages groupés:', error);
      const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue';
      setError(errorMessage);
      toast({
        title: 'Erreur',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Carte d'envoi de message */}
          <div className="lg:col-span-2 order-2 lg:order-1 space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">Envoi de message groupé</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {selectedContacts.length > 0 
                        ? `${selectedContacts.length} destinataire${selectedContacts.length > 1 ? 's' : ''} sélectionné${selectedContacts.length > 1 ? 's' : ''}` 
                        : 'Sélectionnez un groupe ou des contacts individuels'}
                    </p>
                  </div>
                  {selectedContacts.length > 0 && (
                    <div className="bg-primary/10 text-primary text-sm px-3 py-1 rounded-full">
                      {selectedContacts.length} contact{selectedContacts.length > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="flex items-center gap-2 text-base font-medium mb-2">
                        <Users className="h-4 w-4" />
                        Sélection des destinataires
                      </Label>
                      
                      {selectedContacts.length > 0 && (
                        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                          <div className="flex justify-between items-center mb-3">
                            <p className="text-sm font-medium">
                              {selectedContacts.length} destinataire{selectedContacts.length > 1 ? 's' : ''} sélectionné{selectedContacts.length > 1 ? 's' : ''}
                            </p>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setSelectedContacts([])}
                              className="text-destructive hover:text-destructive/80"
                            >
                              Tout effacer
                            </Button>
                          </div>
                          <div className="max-h-40 overflow-y-auto space-y-1 p-1">
                            <div className="flex flex-wrap gap-2">
                              {selectedContacts.map((contact, index) => {
                                // Vérifier si le contact est valide
                                if (!contact) return null;
                                
                                // Normaliser le format du contact
                                let contactInfo;
                                if (typeof contact === 'string') {
                                  contactInfo = { 
                                    fullNumber: contact, 
                                    countryCode: 'GA',
                                    contactName: ''
                                  };
                                } else {
                                  contactInfo = {
                                    fullNumber: contact.fullNumber || '',
                                    countryCode: contact.countryCode || 'GA',
                                    contactName: contact.contactName || ''
                                  };
                                }
                                
                                // Vérifier si le numéro est valide
                                if (!contactInfo.fullNumber) return null;
                                
                                // Extraire les 4 derniers chiffres pour l'affichage
                                const lastDigits = contactInfo.fullNumber.slice(-4);
                                const displayName = contactInfo.contactName || `+${contactInfo.countryCode === 'GA' ? '241' : '33'}...${lastDigits}`;
                                
                                return (
                                  <div 
                                    key={`${contactInfo.fullNumber}-${index}`}
                                    className="inline-flex items-center gap-1 bg-muted/50 hover:bg-muted rounded-full px-2.5 py-1 text-xs font-medium transition-colors"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={true}
                                      onChange={() => setSelectedContacts(prev => 
                                        prev.filter((_, i) => i !== index)
                                      )}
                                      className="h-3 w-3 rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    <span className="truncate max-w-[100px]">
                                      {displayName}
                                    </span>
                                    <button 
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedContacts(prev => 
                                          prev.filter((_, i) => i !== index)
                                        );
                                      }}
                                      className="ml-1 text-muted-foreground hover:text-destructive"
                                    >
                                      ×
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="mb-4 lg:hidden">
                        <GroupContactsSelector 
                          onSelectContacts={handleSelectContacts}
                          selectedContacts={selectedContacts.map(c => c ? c.fullNumber : '').filter(Boolean)}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="emetteur" className="flex items-center gap-2">
                          <Send className="h-4 w-4" />
                          Émetteur
                        </Label>
                        <Select
                          value={selectedEmetteur}
                          onValueChange={setSelectedEmetteur}
                          disabled={isLoading || emetteurs.length === 0}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Sélectionnez un émetteur" />
                          </SelectTrigger>
                          <SelectContent>
                            {emetteurs.map((emetteur) => (
                              <SelectItem key={emetteur.id} value={emetteur.id}>
                                {emetteur.nom}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {emetteurs.length === 0 && (
                          <p className="text-sm text-muted-foreground">
                            Aucun émetteur disponible. Veuillez en créer un dans les paramètres.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="message" className="flex items-center gap-2 text-base font-medium">
                          <MessageSquare className="h-4 w-4" />
                          Message groupé
                        </Label>
                        <div className="flex flex-col items-end">
                          <span className="text-xs text-muted-foreground">
                            {message.length}/160 caractères • {Math.ceil(message.length / 160)} SMS par destinataire
                          </span>
                          {selectedContacts.length > 0 && message.length > 0 && (
                            <span className="text-xs font-medium text-primary">
                              Total : {selectedContacts.length * Math.ceil(message.length / 160)} SMS
                            </span>
                          )}
                        </div>
                      </div>
                      <Textarea
                        id="message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Saisissez votre message ici..."
                        className="min-h-[150px] font-mono text-sm"
                        maxLength={160}
                      />
                      <p className="text-xs text-muted-foreground">
                        Le message sera envoyé à {selectedContacts.length} destinataire{selectedContacts.length > 1 ? 's' : ''}.
                      </p>
                    </div>
                  
                    {error && (
                      <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-md">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center pt-4 border-t">
                      <div className="text-sm text-muted-foreground">
                        {selectedContacts.length > 0 ? (
                          <div className="space-y-1">
                            <div>
                              <span className="font-medium">{selectedContacts.length}</span> destinataire{selectedContacts.length > 1 ? 's' : ''} sélectionné{selectedContacts.length > 1 ? 's' : ''}
                            </div>
                            {message.length > 0 && (
                              <div className="text-xs">
                                <span className="font-medium">{Math.ceil(message.length / 160)}</span> SMS × {selectedContacts.length} destinataires = 
                                <span className="font-bold text-primary ml-1">
                                  {selectedContacts.length * Math.ceil(message.length / 160)} SMS au total
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            Sélectionnez des destinataires
                          </div>
                        )}
                      </div>
                      <Button 
                        type="submit" 
                        className="gap-2"
                        disabled={isLoading || selectedContacts.length === 0 || !message.trim() || !selectedEmetteur}
                      >
                        {isLoading ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Envoi en cours...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4" />
                            {`Envoyer à ${selectedContacts.length} destinataire${selectedContacts.length > 1 ? 's' : ''}`}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
          
          {/* Panneau latéral des groupes */}
          <div className="lg:col-span-1 order-1 lg:order-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Groupes de contacts</CardTitle>
              </CardHeader>
              <CardContent>
                <GroupContactsSelector 
                  onSelectContacts={handleSelectContacts}
                  selectedContacts={selectedContacts.map(c => c.fullNumber)}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
