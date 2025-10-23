'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
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
    // Accepter :
    // - Numéros commençant par + suivi de chiffres (ex: +33612345678)
    // - Numéros avec uniquement des chiffres (ex: 33612345678)
    return /^(\+\d{1,14}|\d{1,15})$/.test(phone);
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
      toast.error(`Certains numéros sont invalides : ${invalidNumbers.map(c => c.fullNumber).join(', ')}`);
      return;
    }

    if (!message.trim()) {
      toast.error('Veuillez saisir un message');
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

      // Préparer les numéros pour l'envoi - accepter tous les formats
      const numeros = selectedContacts.map(contact => {
        // Retourner le numéro tel quel avec le + s'il est présent
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
        
        try {
          // Essayer de parser la réponse en JSON d'abord
          const errorData = await response.json();
          console.error('Détails de l\'erreur:', errorData);
          
          // Si l'API renvoie une liste de numéros invalides
          if (errorData.invalidNumbers && Array.isArray(errorData.invalidNumbers)) {
            throw new Error(`Certains numéros sont invalides : ${errorData.invalidNumbers.join(', ')}`);
          }
          
          // Si l'API renvoie un message d'erreur
          if (errorData.message) {
            throw new Error(errorData.message);
          }
          
          // Si on a des données mais pas de format connu
          throw new Error(JSON.stringify(errorData, null, 2));
          
        } catch (jsonError) {
          // Si le parsing JSON échoue, utiliser le texte brut
          const errorText = await response.text();
          console.error('Erreur brute de la réponse:', errorText);
          throw new Error(errorText || 'Erreur inconnue lors de l\'envoi des messages');
        }
      }
      
      const responseData = await response.json();
      
      toast.success(`Message envoyé à ${selectedContacts.length} contact(s) avec succès`);

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
                      
                      {selectedContacts.length > 0 ? (
                        <div className="flex flex-wrap gap-2 p-3 bg-muted/20 rounded-md border">
                          {selectedContacts.map((contact, index) => {
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
                            
                            const displayName = contactInfo.contactName || contactInfo.fullNumber;
                            
                            return (
                              <div 
                                key={`${contactInfo.fullNumber}-${index}`} 
                                className="flex items-center gap-2 bg-background px-3 py-1.5 rounded-full border text-sm"
                              >
                                <span className="truncate max-w-[180px]">{displayName}</span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedContacts(prev => 
                                    prev.filter((_, i) => i !== index)
                                  )}
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  <span className="sr-only">Retirer</span>
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground p-4 bg-muted/20 rounded-md border">
                          Aucun destinataire sélectionné. Sélectionnez des contacts dans la liste à droite.
                        </div>
                      )}
                      
                      <div className="mb-4 lg:hidden">
                        <GroupContactsSelector 
                          onSelectContacts={handleSelectContacts}
                          selectedContacts={selectedContacts.map(c => c ? c.fullNumber : '').filter(Boolean)}
                          allowMultipleSelection={true}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="emetteur" className="flex items-center gap-2 text-sm">
                        <Send className="h-3.5 w-3.5" />
                        Émetteur
                      </Label>
                      <div className="flex items-center gap-2">
                        <Select
                          value={selectedEmetteur}
                          onValueChange={setSelectedEmetteur}
                          disabled={isLoading || emetteurs.length === 0}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Sélectionner..." />
                          </SelectTrigger>
                          <SelectContent>
                            {emetteurs.map((emetteur) => (
                              <SelectItem key={emetteur.id} value={emetteur.id} className="text-sm">
                                {emetteur.nom}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {emetteurs.length === 0 && (
                          <p className="text-xs text-muted-foreground">
                            Aucun émetteur disponible
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
                        className="min-h-[150px]"
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
                  allowMultipleSelection={true}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
