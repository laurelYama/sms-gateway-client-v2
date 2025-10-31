'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ChevronDown } from 'lucide-react';
import { updateContact } from '@/lib/api/contacts';
import { fetchCountryCodes } from '@/lib/api/countries';
import { toast } from 'sonner';

const formSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  countryCode: z.string().min(1, 'El código de país es obligatorio'),
  number: z.string()
    .min(1, 'El número es obligatorio')
    .regex(/^[0-9]+$/, 'El número solo debe contener dígitos')
});

type FormValues = z.infer<typeof formSchema>;

interface CountryCode {
  refID: number;
  value1: string;   // Nom du pays
  value2: string;   // Indicatif (ex: "+33")
}

interface EditContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: {
    id: string;
    contactName: string;
    contactNumber: string;
  } | null;
  onSuccess?: () => void;
}

export function EditContactDialog({ open, onOpenChange, contact, onSuccess }: EditContactDialogProps) {
  const [loading, setLoading] = useState(false);
  const [countryCodes, setCountryCodes] = useState<CountryCode[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);

  // Charger les indicatifs pays
  useEffect(() => {
    const loadCountries = async () => {
      try {
        const codes = await fetchCountryCodes();
        // Créer un Set pour éliminer les doublons basés sur l'indicatif
        const uniqueCodes = Array.from(
          new Map(codes.map(code => [code.value2, code])).values()
        );
        setCountryCodes(uniqueCodes);
      } catch (error) {
        console.error('Erreur lors du chargement des indicatifs pays:', error);
        toast.error('No se pudieron cargar los códigos de país');
      } finally {
        setLoadingCountries(false);
      }
    };

    if (open) {
      loadCountries();
    }
  }, [open]);

  // Extraire l'indicatif et le numéro du numéro complet
  const extractCountryCode = (phoneNumber: string) => {
    if (!phoneNumber) return { prefix: '+241', number: '' };
    
    // Si le numéro commence par un +, on essaie d'extraire l'indicatif
    if (phoneNumber.startsWith('+')) {
      // On suppose que les 3 premiers caractères sont l'indicatif (ex: +33, +241)
      const prefix = phoneNumber.substring(0, 4);
      const number = phoneNumber.substring(4).trim();
      return { prefix, number };
    }
    
    // Par défaut, on utilise l'indicatif du Gabon
    return { prefix: '+241', number: phoneNumber };
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: contact?.contactName || '',
      countryCode: '+241',
      number: contact?.contactNumber ? extractCountryCode(contact.contactNumber).number : ''
    }
  });

  // Mettre à jour les valeurs du formulaire quand le contact change
  useEffect(() => {
    if (contact) {
      const { prefix, number } = extractCountryCode(contact.contactNumber);
      form.reset({
        name: contact.contactName,
        countryCode: prefix,
        number: number
      });
    }
  }, [contact, form]);

  const onSubmit = async (data: FormValues) => {
    if (!contact) return;
    
    try {
      setLoading(true);
      
      // Combiner l'indicatif et le numéro
      const fullNumber = `${data.countryCode}${data.number.replace(/\s+/g, '')}`;
      
      console.log('Mise à jour du contact avec:', {
        name: data.name,
        number: fullNumber
      });
      
      await updateContact(contact.id, {
        name: data.name,
        number: fullNumber
      });
      
      toast.success('Contacto actualizado correctamente');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Erreur lors de la mise à jour du contact:', error);
      toast.error(error instanceof Error ? error.message : 'Ocurrió un error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar contacto</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del contacto</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Nombre del contacto" 
                      {...field} 
                      disabled={loading} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="countryCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código de país</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={loading || loadingCountries}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar país" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {countryCodes.map((country, index) => (
                          <SelectItem 
                            key={`${country.value2}-${index}`}
                            value={country.value2}
                            className="flex items-center"
                          >
                            <span className="font-mono mr-2">{country.value2}</span>
                            <span className="text-muted-foreground">{country.value1}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="number"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Número de teléfono</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          placeholder="Número de teléfono" 
                          {...field} 
                          disabled={loading}
                          className="pl-2"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <DialogFooter className="mt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
