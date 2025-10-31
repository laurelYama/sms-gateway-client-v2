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
  nomGroupe: z.string().min(1, 'El nombre es obligatorio'),
  descriptionGroupe: z
    .string()
    .max(50, 'La descripción no debe exceder 50 caracteres')
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
          toast.error('Error al cargar el grupo');
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
        toast.success('Grupo actualizado correctamente');
      } else {
        await createGroupe(groupeData);
        toast.success('Grupo creado correctamente');
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/dashboard/groupes');
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du groupe:', error);
      toast.error('Error al guardar el grupo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>{groupeId ? 'Editar grupo' : 'Nuevo grupo'}</CardTitle>
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
                      <FormLabel>Nombre del grupo *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ingrese el nombre del grupo"
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
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Ingrese una descripción (opcional)"
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
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {groupeId ? 'Actualizar' : 'Crear grupo'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
