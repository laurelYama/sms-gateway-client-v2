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
  name: z.string().min(1, 'El nombre es obligatorio'),
  number: z.string().min(1, 'El número es obligatorio'),
  groupId: z.string().min(1, 'El grupo es obligatorio')
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
  const [countries, setCountries] = useState<Array<{keyValue: string, value1: string, value2: string}>>([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [countryCode, setCountryCode] = useState('');

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      number: '',
      groupId: groupId || ''
    },
  });

  // Charger les pays et les groupes depuis l'API
  useEffect(() => {
    const loadCountries = async () => {
      try {
        const countryData = await fetchCountryCodes();
        
        if (!countryData || countryData.length === 0) {
          setCountries([]);
          setSelectedCountry('');
          setCountryCode('');
          return;
        }
        
        const sortedCountries = [...countryData].sort((a, b) => 
          a.value1.localeCompare(b.value1, 'fr', {sensitivity: 'base'})
        );
        
        setCountries(sortedCountries);
        
        // Sélectionner le premier pays de la liste
        if (sortedCountries.length > 0) {
          const defaultCountry = sortedCountries[0];
          setSelectedCountry(defaultCountry.keyValue);
          setCountryCode(defaultCountry.value2);
        }
      } catch (error) {
        setCountries([]);
        setSelectedCountry('');
        setCountryCode('');
      }
    };

    const loadGroupes = async () => {
      try {
        setLoadingGroupes(true);
        
        const user = getUserFromCookies();
        
        if (!user) {
          throw new Error('Por favor, inicie sesión nuevamente');
        }
        
        if (!user.id) {
          throw new Error('ID de usuario no encontrado');
        }
        
        const data = await getGroupes(user.id);
        
        const uniqueGroups = Array.from(
          new Map(
            data.map(group => [
              group.idClientsGroups,
              {
                id: group.idClientsGroups,
                nomGroupe: group.nomGroupe || 'Sans nom'
              }
            ])
          ).values()
        );
        
        setGroupes(uniqueGroups);
        
        if (groupId && uniqueGroups.some(g => g.id === groupId)) {
          form.setValue('groupId', groupId);
        } else if (uniqueGroups.length > 0) {
          form.setValue('groupId', uniqueGroups[0].id);
        }
      } catch (error) {
        toast.error('Erreur lors du chargement des groupes');
      } finally {
        setLoadingGroupes(false);
      }
    };
    
    if (open) {
      loadCountries();
      loadGroupes();
    }
  }, [open, groupId, form]);

  // Mettre à jour le formulaire si le groupId change
  useEffect(() => {
    if (groupId) {
      form.setValue('groupId', groupId);
    }
  }, [groupId, form]);

  const onSubmit = async (data: ContactFormValues) => {
    // Validation supplémentaire
    if (!data.name || !data.number) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    
    if (!data.groupId) {
      toast.error('Veuillez sélectionner un groupe');
      return;
    }
    
    try {
      setLoading(true);
      
      const token = getTokenFromCookies();
      
      if (!token) {
        throw new Error('Non authentifié. Veuillez vous reconnecter.');
      }
      
      // Récupérer les données du pays sélectionné
      const selectedCountryData = countries.find(c => c.keyValue === selectedCountry);
      
      // Formater le numéro de téléphone avec l'indicatif du pays
      const cleanNumber = data.number.replace(/\s+/g, '');
      const formattedNumber = selectedCountryData ? 
        `${selectedCountryData.value2}${cleanNumber}` : 
        `+${cleanNumber}`;
      
      const requestBody = {
        groupId: data.groupId,
        number: formattedNumber,
        name: data.name,
        countryCode: selectedCountryData?.value2 || ''
      };
      
      const response = await fetch('https://api-smsgateway.solutech-one.com/api/V1/contacts/create', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify(requestBody)
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.message || `Erreur ${response.status}: ${response.statusText}`);
      }
      
      toast.success('Contact ajouté avec succès');
      setOpen(false);
      form.reset({
        name: '',
        number: '',
        groupId: groupId || ''
      });
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'ajout du contact');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Añadir contacto
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Añadir nuevo contacto</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del contacto *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ingrese el nombre del contacto" 
                        {...field} 
                        disabled={loading} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="space-y-2">
                <FormLabel>Número de teléfono *</FormLabel>
                <div className="flex gap-2 items-end">
                  <FormField
                    name="countryCode"
                    render={() => (
                      <div className="w-1/3">
                        <Select
                          value={selectedCountry}
                          onValueChange={(value) => {
                            const country = countries.find(c => c.keyValue === value);
                            if (country) {
                              setSelectedCountry(value);
                              setCountryCode(country.value2);
                            }
                          }}
                          disabled={loading || countries.length === 0}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={
                              countries.length === 0 ? 'Cargando...' : 'País'
                            } />
                          </SelectTrigger>
                          <SelectContent>
                            {countries.map((country) => (
                              <SelectItem 
                                key={country.keyValue} 
                                value={country.keyValue}
                              >
                                {country.value1} ({country.value2})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="number"
                    render={({ field }) => (
                      <FormItem className="flex-1 mb-0">
                        <FormControl>
                          <Input 
                            placeholder="6 12 34 56 78" 
                            {...field} 
                            disabled={loading}
                            value={field.value || ''}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^\d\s]/g, '');
                              field.onChange(value);
                            }}
                          />
                        </FormControl>
                        <FormMessage className="mt-1" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <FormField
                control={form.control}
                name="groupId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grupo *</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value || undefined}
                      disabled={loading || loadingGroupes}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={
                            loadingGroupes 
                              ? 'Cargando grupos...' 
                              : 'Seleccione un grupo'
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
                            No hay grupos disponibles
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    {loadingGroupes && (
                      <FormDescription>Cargando grupos...</FormDescription>
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
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Añadiendo...' : 'Añadir contacto'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default AddContactDialog;
