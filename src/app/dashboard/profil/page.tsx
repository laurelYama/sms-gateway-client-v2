'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Save, Edit, X, User, Building2, MapPin, Phone, Mail, Globe, AlertCircle, CheckCircle2, CreditCard } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { fetchUserProfile, updateUserProfile, type UserProfile } from '@/lib/api/user';
import { getTokenFromCookies } from '@/lib/auth';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Schéma de validation amélioré
const profileFormSchema = z.object({
    raisonSociale: z.string().min(2, {
        message: 'La raison sociale doit contenir au moins 2 caractères.',
    }).max(100, {
        message: 'La raison sociale ne peut pas dépasser 100 caractères.',
    }),
    secteurActivite: z.string({
        required_error: 'Veuillez sélectionner un secteur d\'activité',
    }),
    ville: z.string({
        required_error: 'Veuillez sélectionner une ville',
    }),
    adresse: z.string().max(200, {
        message: 'L\'adresse ne peut pas dépasser 200 caractères.',
    }),
    telephone: z.string()
        .min(8, { message: 'Le numéro de téléphone doit contenir au moins 8 chiffres.' })
        .regex(/^[+]?[\d\s-()]+$/, { message: 'Format de téléphone invalide.' }),
    email: z.string()
        .email({ message: 'Veuillez entrer une adresse email valide.' })
        .toLowerCase(),
    emetteur: z.string().min(2, {
        message: 'L\'émetteur doit contenir au moins 2 caractères.',
    }).max(11, {
        message: 'L\'émetteur SMS ne peut pas dépasser 11 caractères.',
    }),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

// Fonction pour formater la date
function formatDate(date: Date): string {
    const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day} ${month} ${year} à ${hours}:${minutes}`;
}

export default function ProfilePage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [userData, setUserData] = useState<UserProfile | null>(null);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [villes, setVilles] = useState<Array<{keyValue: string, value1: string}>>([]);
    const [secteurs, setSecteurs] = useState<Array<{keyValue: string, value1: string}>>([]);
    const [initialValues, setInitialValues] = useState<ProfileFormValues>({
        raisonSociale: '',
        secteurActivite: '',
        ville: '',
        adresse: '',
        telephone: '',
        email: '',
        emetteur: '',
    });

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileFormSchema),
        defaultValues: initialValues,
        mode: 'onChange',
    });

    // Charger les données du profil
    const loadProfile = async () => {
        try {
            setLoading(true);

            // Récupération sécurisée de l'utilisateur depuis les cookies
            const userCookie = document.cookie
                .split('; ')
                .find(row => row.startsWith('user='))
                ?.split('=')[1];

            let user = {};
            if (userCookie) {
                try {
                    user = JSON.parse(decodeURIComponent(userCookie));
                } catch (error) {
                    console.error('Erreur lors du parsing des données utilisateur:', error);
                }
            }

            // Utiliser l'ID de l'utilisateur ou une valeur par défaut
            const clientId = user?.id || '700001';
            const data = await fetchUserProfile(clientId);

            setUserData(data);

            const formValues = {
                raisonSociale: data.raisonSociale || '',
                secteurActivite: data.secteurActivite || '',
                ville: data.ville || '',
                adresse: data.adresse || '',
                telephone: data.telephone || '',
                email: data.email || '',
                emetteur: data.emetteur || '',
            };

            setInitialValues(formValues);
            form.reset(formValues);
        } catch (error) {
            console.error('Erreur lors du chargement du profil:', error);
            toast({
                title: 'Erreur',
                description: 'Impossible de charger les informations du profil',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    // Charger les données depuis les APIs
    useEffect(() => {
        const fetchVilles = async () => {
            try {
                const token = getTokenFromCookies();
                
                if (!token) {
                    throw new Error('Veuvez vous reconnecter pour continuer');
                }

                const [villesResponse, secteursResponse] = await Promise.all([
                    fetch('https://api-smsgateway.solutech-one.com/api/V1/referentiel/categorie/001', {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        credentials: 'include'
                    }),
                    fetch('https://api-smsgateway.solutech-one.com/api/V1/referentiel/categorie/002', {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        credentials: 'include'
                    })
                ]);
                
                if (!villesResponse.ok || !secteursResponse.ok) {
                    throw new Error('Erreur lors du chargement des données');
                }
                
                const [villesData, secteursData] = await Promise.all([
                    villesResponse.json(),
                    secteursResponse.json()
                ]);
                
                setVilles(villesData);
                setSecteurs(secteursData);
            } catch (error) {
                console.error('Erreur:', error);
                toast({
                    title: 'Erreur',
                    description: error instanceof Error ? error.message : 'Impossible de charger la liste des villes',
                    variant: 'destructive',
                });
            }
        };

        loadProfile();
        fetchVilles();
    }, []);

    const handleOpenDialog = () => {
        form.reset(initialValues);
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        form.reset(initialValues);
        setDialogOpen(false);
    };

    const onSubmit = async (data: ProfileFormValues) => {
        if (!userData) return;

        try {
            setSaving(true);
            const updatedProfile = await updateUserProfile(userData.idclients, data);

            setUserData(updatedProfile);
            setInitialValues(data);
            setLastSaved(new Date());
            setDialogOpen(false);

            const user = JSON.parse(localStorage?.getItem('user') || '{}');
            localStorage?.setItem('user', JSON.stringify({
                ...user,
                email: data.email,
                name: data.raisonSociale,
            }));

            toast({
                title: 'Succès',
                description: 'Votre profil a été mis à jour avec succès',
            });
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

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Chargement de votre profil...</p>
            </div>
        );
    }

    if (!userData) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Impossible de charger le profil</h3>
                <p className="text-muted-foreground mb-6">Une erreur est survenue lors du chargement de vos informations</p>
                <Button onClick={loadProfile}>
                    Réessayer
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-8">
            {/* En-tête */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Mon Profil</h1>
                    <p className="text-muted-foreground mt-1">
                        Gérez les informations de votre compte professionnel
                    </p>
                </div>
                <Button onClick={handleOpenDialog} size="lg">
                    <Edit className="h-4 w-4 mr-2" />
                    Modifier le profil
                </Button>
            </div>

            {/* Statut du compte - Card épinglée */}
            <Card className="border-2">
                <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <p className="font-semibold text-lg">{userData.raisonSociale}</p>
                                <p className="text-sm text-muted-foreground">{userData.email}</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Badge
                                variant={userData.statutCompte === 'ACTIF' ? 'default' : 'destructive'}
                                className="gap-1"
                            >
                                {userData.statutCompte === 'ACTIF' ? (
                                    <CheckCircle2 className="h-3 w-3" />
                                ) : (
                                    <AlertCircle className="h-3 w-3" />
                                )}
                                {userData.statutCompte || 'Inconnu'}
                            </Badge>
                            <Badge variant="outline" className="gap-1">
                                <CreditCard className="h-3 w-3" />
                                {userData.typeCompte === 'POSTPAYE' ? 'Postpayé' : 'Prépayé'}
                            </Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Informations de l'entreprise */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Informations de l'entreprise
                    </CardTitle>
                    <CardDescription>
                        {lastSaved && (
                            <span className="text-xs">
                Dernière modification le {formatDate(lastSaved)}
              </span>
                        )}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                Raison sociale
                            </p>
                            <p className="text-sm font-semibold">{userData.raisonSociale}</p>
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Globe className="h-4 w-4" />
                                Secteur d'activité
                            </p>
                            <p className="text-sm font-semibold">{userData.secteurActivite}</p>
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                Email
                            </p>
                            <p className="text-sm font-semibold">{userData.email}</p>
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                Téléphone
                            </p>
                            <p className="text-sm font-semibold">{userData.telephone}</p>
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                Ville
                            </p>
                            <p className="text-sm font-semibold">{userData.ville}</p>
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                Adresse
                            </p>
                            <p className="text-sm font-semibold">{userData.adresse}</p>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <p className="text-sm font-medium text-muted-foreground">Émetteur SMS</p>
                            <p className="text-sm font-semibold">{userData.emetteur}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Informations en lecture seule */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Informations réglementaires
                    </CardTitle>
                    <CardDescription>
                        Ces informations ne peuvent pas être modifiées directement
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">NIF (Numéro d'Identification Fiscale)</p>
                            <p className="text-sm font-semibold">{userData.nif || 'Non renseigné'}</p>
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">RCCM (Registre de Commerce)</p>
                            <p className="text-sm font-semibold">{userData.rccm || 'Non renseigné'}</p>
                        </div>
                    </div>

                    <Separator className="my-6" />

                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                            Pour modifier vos informations réglementaires (NIF, RCCM), veuillez contacter le service client.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>

            {/* Dialog de modification */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Edit className="h-5 w-5" />
                            Modifier les informations
                        </DialogTitle>
                        <DialogDescription>
                            Mettez à jour vos informations professionnelles. Les champs marqués d'un * sont obligatoires.
                        </DialogDescription>
                    </DialogHeader>

                    <Form {...form}>
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="raisonSociale"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                <Building2 className="h-4 w-4" />
                                                Raison sociale *
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    disabled={saving}
                                                    placeholder="Nom de votre entreprise"
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
                                            <FormLabel className="flex items-center gap-2">
                                                <Globe className="h-4 w-4" />
                                                Secteur d'activité *
                                            </FormLabel>
                                            <Select 
                                                onValueChange={field.onChange} 
                                                defaultValue={field.value}
                                                disabled={saving}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Sélectionnez un secteur d'activité" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {secteurs.map((secteur) => (
                                                        <SelectItem 
                                                            key={secteur.keyValue} 
                                                            value={secteur.value1}
                                                        >
                                                            {secteur.value1}
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
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                <Mail className="h-4 w-4" />
                                                Email *
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    type="email"
                                                    disabled={saving}
                                                    placeholder="contact@entreprise.com"
                                                />
                                            </FormControl>
                                            <FormDescription className="text-xs">
                                                Utilisé pour les notifications importantes
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="telephone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                <Phone className="h-4 w-4" />
                                                Téléphone *
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    disabled={saving}
                                                    placeholder="+241 XX XX XX XX"
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
                                            <FormLabel className="flex items-center gap-2">
                                                <MapPin className="h-4 w-4" />
                                                Ville *
                                            </FormLabel>
                                            <Select 
                                                onValueChange={field.onChange} 
                                                defaultValue={field.value}
                                                disabled={saving}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Sélectionnez une ville" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {villes.map((ville) => (
                                                        <SelectItem 
                                                            key={ville.keyValue} 
                                                            value={ville.value1}
                                                        >
                                                            {ville.value1}
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
                                    name="adresse"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                <MapPin className="h-4 w-4" />
                                                Adresse *
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    disabled={saving}
                                                    placeholder="Adresse complète"
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
                                        <FormItem className="md:col-span-2">
                                            <FormLabel>Émetteur SMS</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    disabled={saving}
                                                    placeholder="Nom affiché lors de l'envoi de SMS"
                                                    maxLength={11}
                                                />
                                            </FormControl>
                                            <FormDescription className="text-xs">
                                                Ce nom apparaîtra comme expéditeur de vos SMS (maximum 11 caractères)
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleCloseDialog}
                                disabled={saving}
                            >
                                <X className="h-4 w-4 mr-2" />
                                Annuler
                            </Button>
                            <Button
                                type="button"
                                onClick={form.handleSubmit(onSubmit)}
                                disabled={saving || !form.formState.isDirty}
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Enregistrement...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4 mr-2" />
                                        Enregistrer
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
}