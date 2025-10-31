'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Save, X, Edit } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { fetchUserProfile, updateUserProfile, type UserProfile } from '@/lib/api/user';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Schéma de validation avec Zod
const profileFormSchema = z.object({
  raisonSociale: z.string().min(2, {
    message: 'La raison sociale doit contenir au moins 2 caractères.',
  }),
  secteurActivite: z.string().min(2, {
    message: 'Le secteur d\'activité doit contenir au moins 2 caractères.',
  }),
  ville: z.string().min(2, {
    message: 'La ville doit contenir au moins 2 caractères.',
  }),
  adresse: z.string(),
  telephone: z.string().min(8, {
    message: 'Le numéro de téléphone doit contenir au moins 8 chiffres.',
  }),
  email: z.string().email({
    message: 'Veuillez entrer une adresse email valide.',
  }),
  emetteur: z.string().min(2, {
    message: 'L\'émetteur doit contenir au moins 2 caractères.',
  }),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
}

export function ProfileDialog({ open, onOpenChange, clientId }: ProfileDialogProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [userData, setUserData] = useState<UserProfile | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      raisonSociale: '',
      secteurActivite: '',
      ville: '',
      adresse: '',
      telephone: '',
      email: '',
      emetteur: '',
    },
    mode: 'onChange',
  });

  // Fonction pour basculer en mode édition
  const handleEditClick = () => {
    setEditing(true);
  };

  // Fonction pour annuler l'édition
  const handleCancel = () => {
    setEditing(false);
    form.reset();
  };

  // Charger les données du profil
  const loadProfile = async () => {
    if (!open) return;
    
    try {
      setLoading(true);
      const data = await fetchUserProfile(clientId);
      
      setUserData(data);
      
      // Mettre à jour les valeurs du formulaire
      form.reset({
        raisonSociale: data.raisonSociale || '',
        secteurActivite: data.secteurActivite || '',
        ville: data.ville || '',
        adresse: data.adresse || '',
        telephone: data.telephone || '',
        email: data.email || '',
        emetteur: data.emetteur || '',
      });
      
      // Désactiver le mode édition à l'ouverture
      setEditing(false);
    } catch (error) {
      console.error('Erreur lors du chargement du profil:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les informations du profil',
        variant: 'destructive',
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadProfile();
    } else {
      // Réinitialiser le formulaire quand le dialogue est fermé
      form.reset();
      setUserData(null);
    }
  }, [open]);

  const onSubmit = async (data: ProfileFormValues) => {
    if (!userData) return;
    
    try {
      setSaving(true);
      await updateUserProfile(userData.idclients, data);
      
      // Mettre à jour les données locales
      setUserData(prev => prev ? { ...prev, ...data } : null);
      
      // Mettre à jour les infos dans le localStorage
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({
        ...user,
        email: data.email,
        name: data.raisonSociale,
      }));
      
      toast({
        title: 'Succès',
        description: 'Votre profil a été mis à jour avec succès',
      });
      
      // Désactiver le mode édition après un court délai
      setEditing(false);
      
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue lors de la mise à jour du profil',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Rendu du formulaire d'édition
  const renderEditForm = () => (
    <>
      <DialogHeader>
        <DialogTitle>Modifier le profil</DialogTitle>
        <DialogDescription>
          Mettez à jour les informations de votre compte
        </DialogDescription>
      </DialogHeader>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <FormField
              control={form.control}
              name="raisonSociale"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Raison sociale</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      disabled={loading || saving} 
                      placeholder="Votre raison sociale" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="secteurActivite"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Secteur d'activité</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      disabled={loading || saving}
                      placeholder="Votre secteur d'activité" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      type="email"
                      disabled={loading || saving}
                      placeholder="Votre adresse email" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="telephone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Téléphone</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      disabled={loading || saving}
                      placeholder="Votre numéro de téléphone" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ville"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ville</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      disabled={loading || saving}
                      placeholder="Votre ville" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="adresse"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adresse</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      disabled={loading || saving}
                      placeholder="Votre adresse" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="emetteur"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Émetteur SMS</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      disabled={loading || saving}
                      placeholder="Nom de l'émetteur" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <DialogFooter className="border-t pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleCancel}
              disabled={saving}
            >
              <X className="h-4 w-4 mr-2" />
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={loading || saving || !form.formState.isDirty}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Enregistrer les modifications
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );

  // Rendu de la vue en lecture seule
  const renderProfileView = () => (
    <>
      <DialogHeader>
        <DialogTitle>Mon Profil</DialogTitle>
        <DialogDescription>
          Consultez et gérez les informations de votre compte
        </DialogDescription>
      </DialogHeader>
      
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : userData ? (
        <div className="space-y-6 py-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle>Informations du compte</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleEditClick}
                  className="gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Modifier
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Raison sociale</p>
                  <p className="text-base">{userData.raisonSociale || 'Non renseigné'}</p>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Secteur d'activité</p>
                  <p className="text-base">{userData.secteurActivite || 'Non renseigné'}</p>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-base">{userData.email || 'Non renseigné'}</p>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Téléphone</p>
                  <p className="text-base">{userData.telephone || 'Non renseigné'}</p>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Ville</p>
                  <p className="text-base">{userData.ville || 'Non renseigné'}</p>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Adresse</p>
                  <p className="text-base">{userData.adresse || 'Non renseigné'}</p>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Émetteur SMS</p>
                  <p className="text-base">{userData.emetteur || 'Non renseigné'}</p>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Tipo de cuenta</p>
                  <Badge variant={userData.typeCompte === 'POSTPAYE' ? 'default' : 'secondary'} className="capitalize">
                    {userData.typeCompte === 'POSTPAYE' ? 'Pago posterior' : 'Prepago'}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">NIF</p>
                  <p className="text-base">{userData.nif || 'Non renseigné'}</p>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">RCCM</p>
                  <p className="text-base">{userData.rccm || 'Non renseigné'}</p>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Statut du compte</p>
                  <div className="flex items-center">
                    <span className={`h-2 w-2 rounded-full mr-2 ${
                      userData.statutCompte === 'ACTIF' ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <span className="text-sm capitalize">
                      {userData.statutCompte?.toLowerCase() || 'Inconnu'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Impossible de charger les informations du profil</p>
        </div>
      )}
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        {renderProfileView()}
        
        {/* Dialogue d'édition */}
        <Dialog open={editing} onOpenChange={setEditing}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Modifier le profil</DialogTitle>
              <DialogDescription>
                Mettez à jour les informations de votre compte
              </DialogDescription>
            </DialogHeader>
            {renderEditForm()}
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
