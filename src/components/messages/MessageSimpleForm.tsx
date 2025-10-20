'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { User, X, Send, RefreshCw, Users } from 'lucide-react';
import GroupContactsSelector from './group-contacts-selector';
import { getTokenFromCookies, getUserFromCookies } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/components/ui/use-toast";
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { fetchCountryCodes } from '@/lib/api/countries';
import { fetchEmetteurs } from '@/lib/api/emetteurs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form } from '@/components/ui/form';

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
  const { toast } = useToast();
  const form = useForm<FormValues>({
    defaultValues: {
      phone: '',
      country: 'GA',
    },
  });

  const [isLoading, setIsLoading] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [emetteurs, setEmetteurs] = useState<Emetteur[]>([]);
  const [selectedCountry, setSelectedCountry] = useState('GA');
  const [fullNumber, setFullNumber] = useState('');     // Numéro complet avec indicatif
  const [localNumber, setLocalNumber] = useState('');   // Numéro local sans indicatif
  const [message, setMessage] = useState('');
  const [selectedEmetteur, setSelectedEmetteur] = useState('');
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);

  // Charger pays et émetteurs
  useEffect(() => {
    const loadData = async () => {
      try {
        const countryData = await fetchCountryCodes();
        const sortedCountries = [...countryData].sort((a, b) =>
            b.value2.replace(/\s/g, '').length - a.value2.replace(/\s/g, '').length
        );
        setCountries(sortedCountries);

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

  // Détection automatique du pays et extraction du numéro local
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.trim();

    // Retirer tout sauf chiffres (on ignore + ici)
    const numericValue = value.replace(/\D/g, '');

    // Trier les pays par longueur de code décroissante
    const sortedCountries = [...countries].sort(
      (a, b) => b.value2.replace(/\D/g, '').length - a.value2.replace(/\D/g, '').length
    );

    // Chercher un pays qui correspond à un préfixe du numéro complet
    let matchedCountry: Country | null = null;
    let local = numericValue;

    for (const country of sortedCountries) {
      const code = country.value2.replace(/\D/g, ''); // ex: +241 -> 241
      if (numericValue.startsWith(code)) {
        matchedCountry = country;
        local = numericValue.slice(code.length); // on retire l'indicatif pour l'input
        break;
      }
    }

    if (matchedCountry) {
      setSelectedCountry(matchedCountry.keyValue);
      form.setValue('country', matchedCountry.keyValue);
    } else {
      setSelectedCountry('GA'); // par défaut
      form.setValue('country', 'GA');
    }

    setLocalNumber(local);            // input = numéro local
    form.setValue('phone', local);
    setFullNumber((matchedCountry?.value2.replace(/\s/g, '') || '+241') + local); // pour l'envoi
  };

  // Changement manuel du pays
  const handleCountryChange = (code: string) => {
    setSelectedCountry(code);
    form.setValue('country', code);
  };

  // Sélection d’un contact
  const handleContactSelect = (contacts: any[]) => {
    if (contacts.length === 0) {
      setSelectedContacts([]);
      setLocalNumber('');
      setFullNumber('');
      form.setValue('phone', '');
      setSelectedCountry('GA');
      return;
    }

    const contact = contacts[0];
    const number = contact.number || contact;
    handlePhoneChange({ target: { value: number } } as any);
  };

  // Envoi du message
  const handleSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      const user = getUserFromCookies();
      const token = getTokenFromCookies();
      if (!user?.id || !token) throw new Error('Non authentifié.');
      if (!message.trim()) throw new Error('Le message ne peut pas être vide.');

      // Validation du numéro de téléphone
      const country = countries.find(c => c.keyValue === selectedCountry);
      if (!country) throw new Error('Pays non valide.');
      
      const phoneNumber = `${country.value2.replace(/\s+/g, '')}${data.phone}`.replace(/\s+/g, '');
      
      // Vérification basique du format du numéro
      if (!/^\+?[0-9]{8,15}$/.test(phoneNumber)) {
        throw new Error('Le numéro de téléphone saisi est invalide. Vérifiez le format et réessayez.');
      }

      const body = {
        clientId: user.id,
        emetteur: selectedEmetteur,
        destinataire: phoneNumber,
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
      
      toast({ 
        title: 'Succès', 
        description: 'Message envoyé avec succès.',
        variant: 'default',
      });
      
      // Réinitialisation du formulaire
      form.reset({ phone: '', country: 'GA' });
      setMessage('');
      setLocalNumber('');
      setFullNumber('');
      setSelectedCountry('GA');
    } catch (err: any) {
      toast({
        title: 'Erreur',
        description: err.message || 'Une erreur est survenue lors de l\'envoi du message.',
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
      <div className="flex flex-col h-full">
        <div className="flex flex-col md:flex-row gap-6 w-full max-w-6xl mx-auto">
          <Card className="flex-1">
            <CardHeader>
              <div className="space-y-1">
                <CardTitle className="text-2xl font-bold">Envoi de message simple</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Envoyez un message SMS à un ou plusieurs destinataires en quelques clics
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
                      <div className="flex gap-2">
                        <div className="w-1/3">
                          <Select value={selectedCountry} onValueChange={handleCountryChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Pays" />
                            </SelectTrigger>
                            <SelectContent>
                              {countries.map(c => (
                                  <SelectItem key={c.keyValue} value={c.keyValue}>
                                    {c.value1} ({c.value2})
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
                              value={localNumber}
                              onChange={handlePhoneChange}
                              placeholder="Numéro de téléphone"
                              className="pl-10"
                          />
                          {localNumber && (
                              <button
                                  type="button"
                                  onClick={() => {
                                    setLocalNumber('');
                                    setFullNumber('');
                                    form.setValue('phone', '');
                                  }}
                                  className="absolute inset-y-0 right-2 flex items-center"
                              >
                                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                              </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label>Message</Label>
                      <Textarea
                          placeholder="Saisissez votre message..."
                          value={message}
                          onChange={e => setMessage(e.target.value)}
                          className="min-h-[120px]"
                      />
                      <p className="text-sm text-muted-foreground">{message.length}/160 caractères</p>
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
                      selectedContacts={selectedContacts}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
  );
}
