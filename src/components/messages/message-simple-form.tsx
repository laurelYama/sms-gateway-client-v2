'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { MessageSquare, User, AlertCircle, Send, PlusCircle, Search, Phone, RefreshCw, Check } from 'lucide-react';
import { getTokenFromCookies } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchContacts } from '@/lib/api/contacts';
import { fetchCountryCodes } from '@/lib/api/countries';
import { fetchEmetteurs } from '@/lib/api/emetteurs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { cn } from '@/lib/utils';

interface FormValues {
  phone: string;
  country: string;
}

export function MessageSimpleForm() {
  useEffect(() => {
    // Désactiver le défilement de la page
    document.body.style.overflow = 'hidden';
    // Nettoyer l'effet lors du démontage du composant
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);
  
  const form = useForm<FormValues>();
  
  // Initialiser les valeurs par défaut dans un useEffect
  useEffect(() => {
    form.reset({
      phone: '',
      country: 'GA' // Par défaut Gabon
    });
  }, [form]);

  const [contacts, setContacts] = useState<Array<{contactNumber: string, contactName: string}>>([]);
  const [filteredContacts, setFilteredContacts] = useState<Array<{contactNumber: string, contactName: string}>>([]);
  const [selectedContact, setSelectedContact] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [totalContacts, setTotalContacts] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+241');
  const [countries, setCountries] = useState<Array<{keyValue: string, value1: string, value2: string}>>([]);
  const [selectedCountry, setSelectedCountry] = useState('GA'); // Par défaut Gabon
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [emetteurs, setEmetteurs] = useState<Array<{id: string, nom: string}>>([]);
  const [selectedEmetteur, setSelectedEmetteur] = useState('');
  const [loadingEmetteurs, setLoadingEmetteurs] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  // Charger les pays au montage du composant
  useEffect(() => {
    const loadCountries = async () => {
      try {
        const countryData = await fetchCountryCodes();
        // Trier les pays par nom
        const sortedCountries = [...countryData].sort((a, b) => 
          a.value1.localeCompare(b.value1, 'fr', {sensitivity: 'base'})
        );
        setCountries(sortedCountries);
      } catch (error) {
        console.error('Erreur lors du chargement des pays:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de charger la liste des pays. Veuillez réessayer plus tard.',
          variant: 'destructive',
        });
      }
    };

    // Charger les émetteurs
    const loadEmetteurs = async () => {
      setLoadingEmetteurs(true);
      try {
        console.log('Début du chargement des émetteurs...');
        const emetteursData = await fetchEmetteurs();
        console.log('Émetteurs chargés:', emetteursData);
        
        // Trier les émetteurs par nom
        const sortedEmetteurs = [...emetteursData].sort((a, b) => 
          a.nom.localeCompare(b.nom, 'fr', {sensitivity: 'base'})
        );
        
        setEmetteurs(sortedEmetteurs);
        
        // Sélectionner le premier émetteur par défaut s'il y en a un
        if (sortedEmetteurs.length > 0) {
          console.log('Sélection du premier émetteur:', sortedEmetteurs[0].nom);
          setSelectedEmetteur(sortedEmetteurs[0].nom);
        } else {
          console.warn('Aucun émetteur trouvé');
          toast({
            title: 'Aucun émetteur disponible',
            description: 'Aucun émetteur n\'a été trouvé pour votre compte.',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Erreur lors du chargement des émetteurs:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de charger la liste des émetteurs. Veuillez réessayer plus tard.',
          variant: 'destructive',
        });
      }
    };

    // Charger les données au montage du composant
    const loadData = async () => {
      try {
        await Promise.all([
          loadCountries(),
          loadEmetteurs()
        ]);
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
      } finally {
        setLoadingEmetteurs(false);
      }
    };

    loadData();
  }, [toast]);

  // Fonction pour effacer la recherche
  const clearSearch = () => {
    setSearchQuery('');
  };

  // Charger les contacts au montage du composant
  useEffect(() => {
    const loadContacts = async () => {
      try {
        setIsSearching(true);
        const data = await fetchContacts(''); // Récupère tous les contacts
        // Trier les contacts par nom
        const sortedContacts = [...data].sort((a, b) => 
          a.contactName.localeCompare(b.contactName, 'fr', {sensitivity: 'base'})
        );
        setContacts(sortedContacts);
        setFilteredContacts(sortedContacts);
        setTotalContacts(sortedContacts.length);
      } catch (error) {
        console.error('Erreur lors de la récupération des contacts:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de charger les contacts. Veuillez réessayer plus tard.',
          variant: 'destructive',
        });
      } finally {
        setIsSearching(false);
      }
    };

    loadContacts();
  }, []);

  // Filtrer les contacts en fonction de la recherche
  useEffect(() => {
    if (!searchQuery) {
      setFilteredContacts(contacts);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = contacts.filter(contact => 
      contact.contactName.toLowerCase().includes(query) || 
      contact.contactNumber.includes(query)
    );
    
    setFilteredContacts(filtered);
  }, [searchQuery, contacts]);

  const handleContactSelect = (contactNumber: string) => {
    const contact = contacts.find(c => c.contactNumber === contactNumber);
    if (!contact) return;

    // Nettoyer le numéro (supprimer les espaces et les caractères non numériques sauf +)
    const cleanNumber = contact.contactNumber.replace(/[^\d+]/g, '');
    
    // Valeurs par défaut
    let phoneNumber = cleanNumber;
    let selectedCountryKey = 'GA'; // Gabon par défaut
    let countryCodeValue = '241'; // Code Gabon par défaut

    // Chercher le pays correspondant au numéro
    for (const country of countries) {
      const code = country.value2.replace(/\D/g, ''); // Nettoyer le code pays
      if (cleanNumber.startsWith(code)) {
        // On a trouvé un indicatif correspondant
        selectedCountryKey = country.keyValue;
        countryCodeValue = code;
        // Extraire le numéro sans l'indicatif
        phoneNumber = cleanNumber.substring(code.length);
        break;
      } else if (cleanNumber.startsWith('+' + code)) {
        // Si le numéro commence par + suivi du code pays
        selectedCountryKey = country.keyValue;
        countryCodeValue = code;
        phoneNumber = cleanNumber.substring(code.length + 1); // +1 pour le signe +
        break;
      }
    }

    console.log('Numéro nettoyé:', {
      original: contact.contactNumber,
      cleanNumber,
      selectedCountryKey,
      countryCodeValue,
      phoneNumber
    });

    // Mettre à jour les états
    setSelectedCountry(selectedCountryKey);
    setCountryCode('+' + countryCodeValue);
    setPhone(phoneNumber);
    setSelectedContact(contact.contactNumber);
    
    // Mettre en surbrillance le contact sélectionné
    setFilteredContacts(prev => 
      prev.map(c => ({
        ...c,
        isSelected: c.contactNumber === contact.contactNumber
      }))
    );
    
    // Donner le focus au champ de numéro
    if (phoneInputRef.current) {
      phoneInputRef.current.focus();
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Ne pas mettre à jour l'état si la valeur contient des caractères non numériques
    if (/^\d*$/.test(e.target.value)) {
      setPhone(e.target.value);
      setSelectedContact('');
    }
  };

  const handleSubmit = async (formData: FormValues) => {
    setError('');
    
    if (!selectedEmetteur) {
      setError('Veuillez sélectionner un émetteur');
      return;
    }
    
    // Vérifier que le numéro ne contient que des chiffres
    if (phone && !/^\d+$/.test(phone)) {
      setError('Le numéro de téléphone ne doit contenir que des chiffres');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Récupérer le token d'authentification
      const token = getTokenFromCookies();
      if (!token) {
        throw new Error('Non authentifié. Veuillez vous reconnecter.');
      }
      
      // Gestion du numéro de téléphone
      let destinataire = '';
      if (selectedContact) {
        // Si c'est un contact, on utilise directement son numéro (qui contient déjà le code pays)
        destinataire = selectedContact.replace(/\D/g, '');
      } else {
        // Si c'est une saisie manuelle, on utilise uniquement le numéro saisi (sans ajouter de code pays)
        destinataire = formData.phone.replace(/\D/g, '');
      }
      
      // S'assurer que le numéro ne commence pas par le code pays en double
      const cleanCountryCode = countryCode.replace(/\D/g, '');
      if (destinataire.startsWith(cleanCountryCode + cleanCountryCode)) {
        destinataire = cleanCountryCode + destinataire.substring(cleanCountryCode.length);
      }
      
      // Ajouter le + devant le numéro
      destinataire = `+${destinataire}`;
      
      // Vérifications de validité du numéro
      if (!destinataire) {
        throw new Error('Veuillez saisir un numéro de téléphone valide.');
      }
      
      if (destinataire.length < 5) {
        throw new Error('Le numéro est trop court. Il doit contenir au moins 5 chiffres.');
      }
      
      if (destinataire.length > 12) {
        throw new Error('Le numéro est trop long. Il ne doit pas dépasser 12 chiffres.');
      }
      
      destinataire = destinataire.slice(0, 12); // Limiter à 12 caractères
      
      // Fonction pour extraire les données du token JWT
      const parseJwt = (token: string) => {
        try {
          return JSON.parse(atob(token.split('.')[1]));
        } catch (e) {
          return null;
        }
      };
      
      const decodedToken = parseJwt(token);
      const clientId = decodedToken?.id || '';
      
      const requestBody = {
        clientId: clientId,
        emetteur: selectedEmetteur,
        destinataire: destinataire,
        corps: message
      };
      
      console.log('Requête API:', {
        url: 'https://api-smsgateway.solutech-one.com/api/V1/sms/unides',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token.substring(0, 10)}...` // Ne pas logger le token complet
        },
        body: requestBody
      });
      
      const response = await fetch('https://api-smsgateway.solutech-one.com/api/V1/sms/unides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      // Lire la réponse une seule fois
      const responseData = await response.text();
      let data;
      
      try {
        data = responseData ? JSON.parse(responseData) : {};
      } catch (e) {
        console.error('Erreur lors du parsing de la réponse:', e);
        throw new Error('Réponse du serveur invalide');
      }
      
      if (!response.ok) {
        console.error('Erreur détaillée:', response.status, response.statusText, data);
        const errorMessage = data?.message || data?.error || 'Erreur lors de l\'envoi du message';
        throw new Error(errorMessage);
      }
      
      toast({
        title: 'Succès',
        description: 'Le message a été envoyé avec succès',
        variant: 'default',
      });
      
      // Réinitialiser le formulaire
      form.reset({
        phone: '',
        country: 'GA' // Valeur par défaut pour le Gabon
      });
      setSelectedContact('');
      setMessage('');
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
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

  const onSubmit = async (data: FormValues) => {
    try {
      setIsLoading(true);
      
      const selectedCountryData = countries.find(c => c.keyValue === selectedCountry);
      const phoneNumber = selectedCountryData ? `${selectedCountryData.value2}${data.phone}` : data.phone;
      
      // Utiliser les données du formulaire pour l'envoi du SMS
      await handleSubmit({
        phone: phoneNumber,
        message: message,
        emetteur: selectedEmetteur,
        countryCode: selectedCountryData?.value2 || ''
      });
      
      // Réinitialiser le formulaire après l'envoi réussi
      form.reset({
        phone: '',
        country: 'GA'
      });
      setPhone('');
      setMessage('');
      setSelectedContact('');
      
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de l\'envoi du message',
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
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <div>
                  <CardTitle className="text-lg">Envoi de message simple</CardTitle>
                  <p className="text-sm text-muted-foreground">Envoi de SMS à un seul destinataire</p>
                </div>
              </CardHeader>
              <div className="px-6 pb-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <Label className="flex items-center gap-2 text-base font-medium mb-2">
                          <User className="h-4 w-4" />
                          Destinataire
                        </Label>
                        
                        {/* Champ de numéro de téléphone avec sélecteur de pays */}
                        <div className="grid grid-cols-1 gap-4">
                          <div className="space-y-2">
                            <Label>Pays et numéro de téléphone</Label>
                            <div className="flex gap-2">
                              <div className="w-1/3">
                                <Select
                                  value={selectedCountry}
                                  onValueChange={(value) => {
                                    const country = countries.find(c => c.keyValue === value);
                                    if (country) {
                                      form.setValue('country', value);
                                      setSelectedCountry(value);
                                      setCountryCode(country.value2);
                                    }
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Pays" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {countries.map((country) => (
                                      <SelectItem key={country.keyValue} value={country.keyValue}>
                                        {country.value1} ({country.value2})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex-1 relative">
                                <Input
                                  {...form.register('phone')}
                                  ref={phoneInputRef}
                                  type="tel"
                                  value={phone}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    form.setValue('phone', value);
                                    setPhone(value);
                                    setSelectedContact('');
                                  }}
                                  placeholder="Numéro de téléphone"
                                  className="pl-10"
                                />
                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                  <Phone className="h-4 w-4 text-muted-foreground" />
                                </div>
                                {phone && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      form.setValue('phone', '');
                                      setPhone('');
                                      setSelectedContact('');
                                      phoneInputRef.current?.focus();
                                    }}
                                    className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Émetteur</Label>
                            <Select
                              value={selectedEmetteur}
                              onValueChange={setSelectedEmetteur}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionnez un émetteur" />
                              </SelectTrigger>
                              <SelectContent>
                                {emetteurs.map((emetteur) => (
                                  <SelectItem key={emetteur.id} value={emetteur.nom}>
                                    {emetteur.nom}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="message" className="flex items-center gap-2 text-base font-medium">
                            <MessageSquare className="h-4 w-4" />
                            Message
                          </Label>
                          <span className="text-sm text-muted-foreground">
                            {message.length}/160 caractères • {Math.ceil(message.length / 160)} message{message.length > 160 ? 's' : ''}
                          </span>
                        </div>
                        <Textarea
                          id="message"
                          placeholder="Saisissez votre message ici..."
                          className="min-h-[120px]"
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
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
                          disabled={isLoading || !phone || !message}
                        >
                          {isLoading ? (
                            <>
                              <RefreshCw className="h-4 w-4 animate-spin" />
                              Envoi en cours...
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4" />
                              Envoyer le message
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </form>
                </Form>
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
                    <span className="text-sm text-muted-foreground">{totalContacts} contact{totalContacts !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Rechercher par nom ou numéro..."
                      className="pl-9 pr-8 h-9 text-sm w-full"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
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
                </div>
              </CardHeader>
              <div className="px-4 pb-4">
                {isSearching ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredContacts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-sm text-muted-foreground">
                    <User className="h-8 w-8 mb-2 text-muted-foreground/50" />
                    <p>{searchQuery ? 'Aucun contact trouvé' : 'Aucun contact disponible'}</p>
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
                ) : (
                  <div className="space-y-2">
                    <div className="max-h-[calc(100vh-300px)] overflow-y-auto rounded-md border">
                      <ul className="divide-y">
                        {filteredContacts.map((contact) => (
                          <li key={contact.contactNumber} className="group">
                            <button
                              type="button"
                              onClick={() => handleContactSelect(contact.contactNumber)}
                              className={`w-full text-left p-3 hover:bg-accent/50 transition-colors ${
                                selectedContact === contact.contactNumber ? 'bg-accent/30' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-foreground">
                                    {contact.contactName}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {contact.contactNumber}
                                  </div>
                                </div>
                                {selectedContact === contact.contactNumber && (
                                  <div className="text-primary">
                                    <Check className="h-4 w-4" />
                                  </div>
                                )}
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
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
}
