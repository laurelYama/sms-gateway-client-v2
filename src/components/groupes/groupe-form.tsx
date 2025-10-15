'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Groupe, createGroupe, updateGroupe, getGroupeById } from '@/lib/api/groupes';
import { getUserFromCookies } from '@/lib/auth';

const formSchema = z.object({
  nomGroupe: z.string().min(1, 'Le nom est requis'),
  descriptionGroupe: z
    .string()
    .max(50, 'La description ne doit pas dépasser 50 caractères')
    .optional(),
});

type GroupeFormValues = z.infer<typeof formSchema>;

interface GroupeFormProps {
  groupeId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function GroupeForm({ groupeId, onSuccess, onCancel }: GroupeFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  const form = useForm<GroupeFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nomGroupe: '',
      descriptionGroupe: '',
      clientId: user?.id,
    },
  });

  useEffect(() => {
    const loadData = async () => {
      const userData = await getUserFromCookies();
      setUser(userData);

      if (groupeId) {
        try {
          const groupe = await getGroupeById(groupeId);
          form.reset({
            nomGroupe: groupe.nomGroupe,
            descriptionGroupe: groupe.descriptionGroupe,
            clientId: userData?.id,
          });
        } catch (error) {
          console.error('Erreur lors du chargement du groupe:', error);
          toast.error('Erreur lors du chargement du groupe');
        }
      }
    };

    loadData();
  }, [groupeId, form]);

  const onSubmit = async (data: GroupeFormValues) => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      const groupeData = {
        clientId: user.id,
        nom: data.nomGroupe,
        description: data.descriptionGroupe || '',
      };

      if (groupeId) {
        await updateGroupe(groupeId, groupeData);
        toast.success('Groupe mis à jour avec succès');
      } else {
        await createGroupe(groupeData);
        toast.success('Groupe créé avec succès');
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/dashboard/groupes');
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du groupe:', error);
      toast.error('Erreur lors de la sauvegarde du groupe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>{groupeId ? 'Modifier le groupe' : 'Nouveau groupe'}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="nomGroupe"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom du groupe *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Entrez le nom du groupe"
                          disabled={loading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="descriptionGroupe"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Entrez une description (optionnel)"
                          disabled={loading}
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={loading}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={loading}>
                  {groupeId ? 'Mettre à jour' : 'Créer le groupe'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
