'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { getTokenFromCookies, getUserFromCookies } from '@/lib/auth';
import { getGroupes } from '@/lib/api/groupes';
import { fetchCountryCodes } from '@/lib/api/countries';

const formSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  number: z.string().min(1, 'Le numéro est requis'),
  groupId: z.string().min(1, 'Le groupe est requis')
});

type ContactFormValues = z.infer<typeof formSchema>;

interface AddContactDialogProps {
  groupId?: string;
  onSuccess?: () => void;
}

export function AddContactDialog({ groupId, onSuccess }: AddContactDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [groupes, setGroupes] = useState<Array<{id: string, nomGroupe: string}>>([]);
  const [loadingGroupes, setLoadingGroupes] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(groupId || '');
  const [countries, setCountries] = useState<Array<{id: string, name: string, prefix: string, originalId: number}>>([]);
  const [selectedCountry, setSelectedCountry] = useState<{code: string, prefix: string}>({ code: 'FR', prefix: '+33' });

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      number: '',
      groupId: groupId || ''
    },
  });

  // Charger les pays et les groupes
  useEffect(() => {
    const loadCountries = async () => {
      try {
        const countriesData = await fetchCountryCodes();
        console.log('Données des pays chargées:', countriesData);
        
        // Vérifier que nous avons des données et qu'elles sont dans le format attendu
        if (!Array.isArray(countriesData)) {
          console.error('Format de données inattendu:', countriesData);
          throw new Error('Format de données des pays invalide');
        }
        
        // Créer un ensemble pour suivre les préfixes déjà vus
        const seenPrefixes = new Set();
        const countriesList = [];
        
        for (const country of countriesData) {
          const prefix = country.value2.trim();
          // Si le préfixe n'a pas encore été vu, l'ajouter à la liste
          if (!seenPrefixes.has(prefix)) {
            seenPrefixes.add(prefix);
            countriesList.push({
              id: `country-${country.refID}-${prefix}`,
              name: country.value1.trim(),
              prefix,
              originalId: country.refID
            });
          }
        }
        
        // Trier par nom de pays
        countriesList.sort((a, b) => a.name.localeCompare(b.name));
        
        console.log(`${countriesList.length} pays uniques chargés`);
        
        setCountries(countriesList);
        
        // Sélectionner le premier pays par défaut
        if (countriesList.length > 0) {
          setSelectedCountry({
            code: countriesList[0].name.substring(0, 2).toUpperCase(),
            prefix: countriesList[0].prefix
          });
        }
      } catch (error) {
        console.error('Erreur lors du chargement des pays:', error);
      }
    };

    const loadGroupes = async () => {
      try {
        setLoadingGroupes(true);
        
        // Récupérer l'utilisateur connecté
        const user = getUserFromCookies();
        console.log('Utilisateur depuis les cookies:', user);
        
        if (!user) {
          throw new Error('Veuillez vous reconnecter');
        }
        
        // Vérifier que l'utilisateur a un ID client
        if (!user.id) {
          throw new Error('ID utilisateur non trouvé');
        }
        
        // Récupérer les groupes de l'utilisateur
        console.log('Récupération des groupes pour l\'utilisateur:', user.id);
        const data = await getGroupes(user.id);
        console.log('Groupes récupérés:', data);
        
        // Mapper les données pour correspondre au type attendu
        // Utiliser un Set pour éliminer les doublons basés sur l'ID
        const uniqueGroups = Array.from(
          new Map(
            data.map(group => [
              group.idClientsGroups, // Utiliser l'ID comme clé pour éliminer les doublons
              {
                id: group.idClientsGroups,
                nomGroupe: group.nomGroupe || 'Sans nom'
              }
            ])
          ).values()
        );
        
        console.log('Groupes uniques:', uniqueGroups);
        setGroupes(uniqueGroups);
        
        // Mettre à jour la valeur du formulaire avec le groupe sélectionné
        if (groupId && uniqueGroups.some(g => g.id === groupId)) {
          form.setValue('groupId', groupId);
          setSelectedGroupId(groupId);
        } else if (uniqueGroups.length > 0) {
          form.setValue('groupId', uniqueGroups[0].id);
          setSelectedGroupId(uniqueGroups[0].id);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des groupes:', error);
        toast.error('Erreur lors du chargement des groupes');
      } finally {
        setLoadingGroupes(false);
      }
    };
    
    if (open) {
      loadCountries();
      loadGroupes();
    }
  }, [open, groupId]); // Retirer form des dépendances
  
  // Mettre à jour le formulaire si le groupId change
  useEffect(() => {
    if (groupId) {
      form.setValue('groupId', groupId);
    }
  }, [groupId, form]);

  const onSubmit = async (data: ContactFormValues) => {
    console.log('1. Début de la soumission du formulaire avec les données:', data);
    
    // Validation supplémentaire
    if (!data.name || !data.number) {
      console.error('Données manquantes:', data);
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    
    if (!data.groupId) {
      console.error('Aucun groupe sélectionné');
      toast.error('Veuillez sélectionner un groupe');
      return;
    }
    
    try {
      setLoading(true);
      console.log('2. Chargement activé');
      
      const token = getTokenFromCookies();
      console.log('3. Token récupéré:', token ? '***' : 'Aucun token trouvé');
      
      if (!token) {
        throw new Error('Non authentifié. Veuillez vous reconnecter.');
      }
      
      console.log('4. Préparation de la requête API');
      
      // Formater le numéro de téléphone avec l'indicatif du pays
      const formattedNumber = `${selectedCountry.prefix}${data.number.replace(/\s+/g, '')}`;
      
      const requestBody = {
        groupId: data.groupId,
        number: formattedNumber,
        name: data.name,
        countryCode: selectedCountry.code
      };
      
      console.log('Données de la requête:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch('https://api-smsgateway.solutech-one.com/api/V1/contacts/create', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include', // Important pour les cookies d'authentification
        body: JSON.stringify(requestBody)
      });
      
      const responseData = await response.json();
      console.log('Réponse de l\'API:', responseData);
      
      if (!response.ok) {
        console.error('Erreur API:', {
          status: response.status,
          statusText: response.statusText,
          data: responseData
        });
        throw new Error(responseData.message || `Erreur ${response.status}: ${response.statusText}`);
      }
      
      toast.success('Contact ajouté avec succès');
      setOpen(false);
      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error('Erreur lors de l\'ajout du contact:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'ajout du contact');
    } finally {
      setLoading(false);
    }
  };

  console.log('Rendu du composant AddContactDialog - État open:', open);
  
  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      console.log('Changement d\'état de la modale:', isOpen);
      setOpen(isOpen);
      if (isOpen) {
        // Réinitialiser le formulaire quand la modale s'ouvre
        form.reset({
          name: '',
          number: '',
          groupId: groupId || ''
        });
      }
    }}>
      <DialogTrigger asChild>
        <Button size="sm" onClick={() => {
          console.log('Clic sur le bouton Ajouter un contact');
          setOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un contact
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un nouveau contact</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom du contact *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Entrez le nom du contact" 
                        {...field} 
                        disabled={loading} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex gap-2">
                <FormField
                  name="countryCode"
                  render={() => (
                    <FormItem className="w-48">
                      <FormLabel>Pays (indicatif)</FormLabel>
                      <Select
                        value={selectedCountry?.prefix}
                        onValueChange={(value) => {
                          const country = countries.find(c => c.prefix === value);
                          if (country) {
                            setSelectedCountry({
                              code: country.name.substring(0, 2).toUpperCase(),
                              prefix: country.prefix
                            });
                          }
                        }}
                        disabled={loading || countries.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={
                            countries.length === 0 ? 'Chargement...' : 'Sélectionnez un pays'
                          } />
                        </SelectTrigger>
                        <SelectContent>
                          {countries.map((country) => (
                            <SelectItem 
                              key={country.id}
                              value={country.prefix}
                              className="flex items-center gap-2"
                            >
                              <span className="font-medium">{country.name}</span>
                              <span className="text-muted-foreground">{country.prefix}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="number"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Numéro de téléphone *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                            {selectedCountry?.prefix}
                          </div>
                          <Input 
                            placeholder="6 12 34 56 78" 
                            {...field} 
                            disabled={loading}
                            className="pl-16"
                            value={field.value || ''}
                            onChange={(e) => {
                              // N'autoriser que les chiffres et espaces
                              const value = e.target.value.replace(/[^\d\s]/g, '');
                              field.onChange(value);
                            }}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="groupId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Groupe *</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value || undefined}
                      disabled={loading || loadingGroupes}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={
                            loadingGroupes 
                              ? 'Chargement des groupes...' 
                              : 'Sélectionnez un groupe'
                          } />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {groupes.length > 0 ? (
                          groupes.map((groupe) => (
                            <SelectItem 
                              key={groupe.id} 
                              value={groupe.id}
                            >
                              {groupe.nomGroupe}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="py-2 px-3 text-sm text-muted-foreground">
                            Aucun groupe disponible
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    {loadingGroupes && (
                      <FormDescription>Chargement des groupes...</FormDescription>
                    )}
                  </FormItem>
                )}
              />
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Ajout en cours...' : 'Ajouter le contact'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
