'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { AlertCircle, Send, RefreshCw, Search, User, MessageSquare, Check, ChevronsUpDown } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { fetchContacts } from '@/lib/api/contacts';
import { fetchEmetteurs } from '@/lib/api/emetteurs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { API_ENDPOINTS } from '@/config/api';

export default function GroupMessagePage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<any[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
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
          setSelectedEmetteur(data[0].id); // Sélectionner le premier émetteur par défaut
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

  // Fonction pour charger les contacts
  const loadContacts = async () => {
    try {
      const data = await fetchContacts(''); // Récupère tous les contacts
      // Trier les contacts par nom
      const sortedContacts = [...data].sort((a, b) => 
        a.contactName.localeCompare(b.contactName, 'fr', {sensitivity: 'base'})
      );
      setContacts(sortedContacts);
      setFilteredContacts(sortedContacts);
      setError('');
    } catch (error) {
      console.error('Erreur lors du chargement des contacts:', error);
      setError('Impossible de charger les contacts. Veuillez réessayer plus tard.');
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les contacts. Veuillez réessayer plus tard.',
        variant: 'destructive',
      });
    }
  };

  // Filtrer les contacts en fonction de la recherche
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredContacts(contacts);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = contacts.filter(
        contact =>
          contact.contactName.toLowerCase().includes(query) ||
          contact.contactNumber.includes(query)
      );
      setFilteredContacts(filtered);
    }
  }, [searchQuery, contacts]);

  useEffect(() => {
    loadContacts();
    // Nettoyage
    return () => {
      // Nettoyer les états si nécessaire
    };
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };
  
  const clearSearch = () => {
    setSearchQuery('');
  };
  
  const selectAllContacts = () => {
    setSelectedContacts(prev => {
      // Si tous les contacts visibles sont déjà sélectionnés, on les désélectionne tous
      const allVisibleSelected = filteredContacts.every(contact => 
        prev.includes(contact.contactNumber)
      );
      
      if (allVisibleSelected) {
        // Désélectionner uniquement les contacts visibles
        return prev.filter(num => 
          !filteredContacts.some(contact => contact.contactNumber === num)
        );
      } else {
        // Ajouter les contacts visibles non encore sélectionnés
        const newSelected = new Set(prev);
        filteredContacts.forEach(contact => {
          newSelected.add(contact.contactNumber);
        });
        return Array.from(newSelected);
      }
    });
  };

  const clearAllContacts = () => {
    setSelectedContacts([]);
  };

  const handleContactSelect = (contactNumber: string) => {
    setSelectedContacts(prev => {
      if (prev.includes(contactNumber)) {
        return prev.filter(num => num !== contactNumber);
      } else {
        return [...prev, contactNumber];
      }
    });
  };

  const validatePhoneNumber = (phone: string): boolean => {
    // Vérifie que le numéro ne dépasse pas 12 caractères et ne contient que des chiffres
    return /^\d{1,12}$/.test(phone);
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
    const invalidNumbers = selectedContacts.filter(num => !validatePhoneNumber(num));
    if (invalidNumbers.length > 0) {
      toast({
        title: 'Erreur',
        description: `Certains numéros sont invalides (max 12 chiffres) : ${invalidNumbers.join(', ')}`,
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

      const requestBody = {
        clientId,
        emetteur: emetteurSelectionne.nom, // Utiliser le nom de l'émetteur sélectionné
        numeros: selectedContacts,
        corps: message
      };

      console.log('Envoi de la requête avec le body:', JSON.stringify(requestBody, null, 2));
      
      try {
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
    } catch (error) {
      console.error('Erreur lors de l\'envoi des messages groupés:', error);
      const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue';
      setError(errorMessage);
      toast({
        title: 'Erreur',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Carte d'envoi de message */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <div>
                  <CardTitle className="text-lg">Envoi de message groupé</CardTitle>
                  <p className="text-sm text-muted-foreground">Envoi de message à plusieurs destinataires</p>
                </div>
              </CardHeader>
              <div className="px-6 pb-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="flex items-center gap-2 text-base font-medium mb-2">
                        <User className="h-4 w-4" />
                        Destinataires
                      </Label>
                      
                      {selectedContacts.length > 0 && (
                        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                          <p className="text-sm font-medium mb-3">Destinataires sélectionnés :</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedContacts.map(contactNumber => {
                              const contact = contacts.find(c => c.contactNumber === contactNumber);
                              return (
                                <div 
                                  key={contactNumber}
                                  className="bg-primary/10 text-primary text-sm px-3 py-1 rounded-full flex items-center gap-2"
                                >
                                  {contact?.contactName || contactNumber}
                                  <button 
                                    type="button"
                                    onClick={() => handleContactSelect(contactNumber)}
                                    className="text-muted-foreground hover:text-destructive text-sm"
                                  >
                                    ×
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="emetteur">
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
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="message" className="flex items-center gap-2 text-base font-medium">
                          <MessageSquare className="h-4 w-4" />
                          Message
                        </Label>
                        <span className="text-xs text-muted-foreground">
                          {message.length}/160 caractères
                        </span>
                      </div>
                      <Textarea
                        id="message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Saisissez votre message ici..."
                        className="min-h-[120px]"
                        maxLength={160}
                      />
                    </div>
                  
                    {error && (
                      <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-md">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-end pt-4 border-t">
                      <Button 
                        type="submit" 
                        className="gap-2"
                        disabled={isLoading || selectedContacts.length === 0 || !message.trim()}
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
              </div>
            </Card>
          </div>
          
          {/* Panneau latéral des contacts */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Contacts</CardTitle>
                    <span className="text-sm text-muted-foreground">{contacts.length} contacts</span>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Rechercher par nom ou numéro..."
                      className="pl-9 pr-8 h-9 text-sm w-full"
                      value={searchQuery}
                      onChange={handleSearchChange}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={clearSearch}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={selectAllContacts}
                      className="whitespace-nowrap"
                    >
                      {filteredContacts.every(contact => selectedContacts.includes(contact.contactNumber)) 
                        ? 'Tout décocher' 
                        : 'Tout cocher'}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={clearAllContacts}
                      disabled={selectedContacts.length === 0}
                      className="whitespace-nowrap"
                    >
                      Tout supprimer
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <div className="px-4 pb-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-sm text-destructive">
                    <AlertCircle className="h-5 w-5 mb-2" />
                    <p>{error}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      onClick={loadContacts}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Réessayer
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="max-h-[calc(100vh-300px)] overflow-y-auto rounded-md border">
                      {filteredContacts.length > 0 ? (
                        <ul className="divide-y">
                          {filteredContacts.map((contact) => (
                            <li key={contact.contactNumber} className="group">
                              <div className="flex items-center px-4 py-3 hover:bg-accent/50">
                                <input
                                  type="checkbox"
                                  id={`contact-${contact.contactNumber}`}
                                  checked={selectedContacts.includes(contact.contactNumber)}
                                  onChange={() => handleContactSelect(contact.contactNumber)}
                                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <label
                                  htmlFor={`contact-${contact.contactNumber}`}
                                  className="ml-3 flex-1 cursor-pointer"
                                >
                                  <div className="font-medium text-foreground">
                                    {contact.contactName}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {contact.contactNumber}
                                  </div>
                                </label>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center text-sm text-muted-foreground">
                          <User className="h-8 w-8 mb-2 text-muted-foreground/50" />
                          <p>Aucun contact trouvé</p>
                          {searchQuery && (
                            <button
                              type="button"
                              onClick={clearSearch}
                              className="mt-2 text-sm text-primary hover:underline"
                            >
                              Réinitialiser la recherche
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
