'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { User, X, Send, RefreshCw, Users, XCircle } from 'lucide-react';
import GroupContactsSelector from './group-contacts-selector';
import { getTokenFromCookies, getUserFromCookies } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { fetchCountryCodes } from '@/lib/api/countries';
import { fetchEmetteurs } from '@/lib/api/emetteurs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form } from '@/components/ui/form';

interface ContactInfo {
  number: string;
  countryCode: string;
  fullNumber: string;
  contactName?: string;
}

type ContactSelection = string | ContactInfo;

interface Country {
  keyValue: string;
  value1: string;
  value2: string; // ex: +241
}

interface Emetteur {
  id: string;
  nom: string;
}

interface FormValues {
  phone: string;
  country: string;
}

export function MessageSimpleForm() {
  const form = useForm<FormValues>({
    defaultValues: {
      phone: '',
      country: '', // Laissé vide pour être défini après le chargement des pays
    },
  });

  const [isLoading, setIsLoading] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [emetteurs, setEmetteurs] = useState<Emetteur[]>([]);
  const [selectedCountry, setSelectedCountry] = useState(''); // Laissé vide initialement
  const [fullNumber, setFullNumber] = useState('');     // Numéro complet avec indicatif
  const [localNumber, setLocalNumber] = useState('');   // Numéro local sans indicatif
  const [message, setMessage] = useState('');
  const [selectedEmetteur, setSelectedEmetteur] = useState('');
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const [selectedContact, setSelectedContact] = useState<ContactSelection | null>(null);

  // Charger pays et émetteurs
  useEffect(() => {
    const loadData = async () => {
      try {
        const countryData = await fetchCountryCodes();
        const sortedCountries = [...countryData].sort((a, b) =>
            b.value2.replace(/\s/g, '').length - a.value2.replace(/\s/g, '').length
        );
        setCountries(sortedCountries);

        // Trouver le pays avec l'indicatif +240
        const defaultCountry = sortedCountries.find(c => c.value2.includes('240'));
        if (defaultCountry) {
          setSelectedCountry(defaultCountry.keyValue);
          form.setValue('country', defaultCountry.keyValue);
        }

        const emetteursData = await fetchEmetteurs();
        const sortedEmetteurs = [...emetteursData].sort((a, b) =>
            a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' })
        );
        setEmetteurs(sortedEmetteurs);

        if (sortedEmetteurs.length > 0) {
          setSelectedEmetteur(sortedEmetteurs[0].nom);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de charger les données nécessaires',
          variant: 'destructive',
        });
      }
    };
    loadData();
  }, [toast]);

  // Gestion de la saisie du numéro de téléphone
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    // On conserve uniquement le numéro local (sans indicatif)
    setLocalNumber(inputValue);
    form.setValue('phone', inputValue);
  };

  // Changement manuel du pays
  const handleCountryChange = (code: string) => {
    setSelectedCountry(code);
    form.setValue('country', code);
  };

  // Sélection d'un contact
  const handleContactSelect = (contacts: any[]) => {
    if (contacts.length === 0) {
      setSelectedContact(null);
      setLocalNumber('');
      setFullNumber('');
      form.setValue('phone', '');
      setSelectedCountry('GQ');
      form.setValue('country', 'GQ');
      return;
    }

    const contact = contacts[0];
    let phoneNumber = '';
    let contactName = '';

    // Récupération du numéro exact tel qu'il est stocké
    if (typeof contact === 'object') {
      phoneNumber = contact.contactNumber || contact.number || '';
      contactName = contact.contactName || '';
    } else {
      phoneNumber = contact;
    }

    // Création de l'objet contact avec le numéro exact
    const contactInfo: ContactInfo = {
      number: phoneNumber,
      countryCode: '',
      fullNumber: phoneNumber, // On conserve le numéro exact
      contactName: contactName,
    };

    setSelectedContact(contactInfo);
    setLocalNumber(phoneNumber); // Mise à jour du numéro local
    setFullNumber(phoneNumber);  // Mise à jour du numéro complet
    form.setValue('phone', phoneNumber);
    
    // On ne modifie pas le pays sélectionné pour conserver le comportement actuel du sélecteur
  };

  // Envoi du message
  const handleSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      const user = getUserFromCookies();
      const token = getTokenFromCookies();
      if (!user?.id || !token) throw new Error('Non authentifié.');
      if (!message.trim()) throw new Error('Le message ne peut pas être vide.');

      // Récupérer le numéro saisi
      let phoneNumber = localNumber;
      let fullPhoneNumber = '';
      
      // Si un contact est sélectionné, utiliser son numéro exact sans ajouter d'indicatif
      if (selectedContact) {
        const selectedNumber = typeof selectedContact === 'string' 
          ? selectedContact 
          : selectedContact.number;
        
        // Nettoyer le numéro (supprimer tout ce qui n'est pas un chiffre ou +)
        fullPhoneNumber = selectedNumber.startsWith('+') 
          ? selectedNumber 
          : `+${selectedNumber}`;
      } else {
        // Pour les numéros saisis manuellement, ajouter l'indicatif
        const cleanNumber = phoneNumber.replace(/\D/g, '');
        
        // Vérification que le numéro n'est pas vide
        if (!cleanNumber || cleanNumber.length === 0) {
          throw new Error('Le numéro de téléphone ne peut pas être vide.');
        }
        
        // Vérification du format du numéro (au moins 8 chiffres)
        if (cleanNumber.length < 8) {
          throw new Error('Le numéro de téléphone doit contenir au moins 8 chiffres.');
        }
        
        // Récupérer l'indicatif du pays sélectionné
        const selectedCountryData = countries.find(c => c.keyValue === selectedCountry);
        const countryCode = selectedCountryData?.value2.replace(/\D/g, '') || '240';
        
        // Construire le numéro complet avec l'indicatif
        fullPhoneNumber = `+${countryCode}${cleanNumber}`;
      }
      
      // Préparer le corps de la requête
      const body = {
        clientId: user.id,
        emetteur: selectedEmetteur,
        destinataire: fullPhoneNumber,
        corps: message,
      };

      const res = await fetch('https://api-smsgateway.solutech-one.com/api/V1/sms/unides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      let errorMessage = 'Une erreur est survenue lors de l\'envoi du message.';
      
      if (!res.ok) {
        try {
          const errorData = await res.json();
          if (res.status === 400 && errorData.message) {
            errorMessage = `Erreur de validation : ${errorData.message}`;
          } else if (res.status === 400) {
            errorMessage = 'Numéro de téléphone invalide. Veuillez vérifier le format et réessayer.';
          }
        } catch (e) {
          // En cas d'erreur de parsing de la réponse d'erreur
          errorMessage = 'Erreur lors de la communication avec le serveur. Veuillez réessayer.';
        }
        throw new Error(errorMessage);
      }

      const responseData = await res.json();
      
      toast.success('Message envoyé avec succès');
      
      // Réinitialisation du formulaire
      const defaultCountry = countries.find(c => c.value2.includes('240'))?.keyValue || '';
      form.reset({ phone: '', country: defaultCountry });
      setMessage('');
      setLocalNumber('');
      setFullNumber('');
      setSelectedCountry(defaultCountry);
      setSelectedContact(null);
    } catch (err: any) {
      toast.error(err.message || 'Une erreur est survenue lors de l\'envoi du message', {
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour effacer la sélection du contact
  const clearSelection = () => {
    const defaultCountry = countries.find(c => c.value2.includes('240'))?.keyValue || '';
    setSelectedContact(null);
    setLocalNumber('');
    setFullNumber('');
    form.setValue('phone', '');
    setSelectedCountry(defaultCountry);
    form.setValue('country', defaultCountry);
  };

  return (
      <div className="flex flex-col h-full">
        <div className="flex flex-col md:flex-row gap-6 w-full max-w-6xl mx-auto">
          <Card className="flex-1">
            <CardHeader>
              <div className="space-y-1">
                <CardTitle className="text-2xl font-bold">Envoi de message simple</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Envoyez un message SMS à un destinataire en quelques clics
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                  <div className="space-y-6 pt-2">
                    <div>
                      <div className="space-y-2">
                        <Label>Destinataire</Label>
                        <p className="text-xs text-muted-foreground">
                          Saisissez le numéro avec l'indicatif pays ou sélectionnez un contact
                        </p>
                      </div>
                      <div className="space-y-4">
                        {selectedContact ? (
                          <div className="border rounded-md p-3 bg-muted/20">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-medium">
                                  {typeof selectedContact === 'object' && selectedContact.contactName 
                                    ? selectedContact.contactName 
                                    : 'Numéro sélectionné'}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {typeof selectedContact === 'object' 
                                    ? selectedContact.fullNumber 
                                    : selectedContact}
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={clearSelection}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col sm:flex-row gap-3">
                            <div className="w-full sm:w-auto sm:min-w-[180px]">
                              <Select 
                                value={selectedCountry} 
                                onValueChange={handleCountryChange}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Sélectionnez un pays" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px] overflow-y-auto">
                                  {countries.map(c => (
                                    <SelectItem 
                                      key={c.keyValue} 
                                      value={c.keyValue}
                                      className="truncate"
                                    >
                                      {c.value1} ({c.value2})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex-1 min-w-0">
                              <Input
                                {...form.register('phone')}
                                ref={phoneInputRef}
                                type="tel"
                                value={localNumber}
                                onChange={handlePhoneChange}
                                placeholder="Numéro de téléphone"
                                className="w-full"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {emetteurs.length > 0 && (
                        <div>
                          <Label>Émetteur</Label>
                          <Select value={selectedEmetteur} onValueChange={setSelectedEmetteur}>
                            <SelectTrigger>
                              <SelectValue placeholder="Choisir un émetteur" />
                            </SelectTrigger>
                            <SelectContent>
                              {emetteurs.map(e => (
                                  <SelectItem key={e.id} value={e.nom}>
                                    {e.nom}
                                  </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label>Message</Label>
                        <span className={`text-xs ${message.length > 160 ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {message.length}/160 caractères
                        </span>
                      </div>
                      <Textarea
                          placeholder="Saisissez votre message..."
                          value={message}
                          onChange={e => setMessage(e.target.value)}
                          className={`min-h-[120px] ${message.length > 160 ? 'border-destructive' : ''}`}
                      />
                      {message.length > 160 && (
                        <p className="text-xs text-destructive">
                          Le message dépasse la limite de 160 caractères
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button type="submit" disabled={isLoading}>
                        {isLoading ? (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                              Envoi en cours...
                            </>
                        ) : (
                            <>
                              <Send className="mr-2 h-4 w-4" />
                              Envoyer le message
                            </>
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          <div className="w-full md:w-80 flex-shrink-0">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" /> Contacts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[500px] overflow-y-auto">
                  <GroupContactsSelector
                      onSelectContacts={handleContactSelect}
                      selectedContacts={selectedContact ? [selectedContact] : []}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
  );
}
