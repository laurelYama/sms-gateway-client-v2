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

// Esquema de validación mejorado
const profileFormSchema = z.object({
    raisonSociale: z.string().min(2, {
        message: 'La razón social debe contener al menos 2 caracteres.',
    }).max(100, {
        message: 'La razón social no puede exceder los 100 caracteres.',
    }),
    secteurActivite: z.string({
        required_error: 'Por favor seleccione un sector de actividad',
    }),
    ville: z.string({
        required_error: 'Por favor seleccione una ciudad',
    }),
    adresse: z.string().max(200, {
        message: 'La dirección no puede exceder los 200 caracteres.',
    }),
    telephone: z.string()
        .min(8, { message: 'El número de teléfono debe contener al menos 8 dígitos.' })
        .regex(/^[+]?[\d\s-()]+$/, { message: 'Formato de teléfono inválido.' }),
    email: z.string()
        .email({ message: 'Por favor ingrese una dirección de correo electrónico válida.' })
        .toLowerCase(),
    emetteur: z.string().min(2, {
        message: 'El emisor debe contener al menos 2 caracteres.',
    }).max(11, {
        message: 'El emisor SMS no puede exceder los 11 caracteres.',
    }),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

// Función para formatear la fecha
function formatDate(date: Date): string {
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day} de ${month} de ${year} a las ${hours}:${minutes}`;
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
                title: 'Error',
                description: 'No se pudieron cargar los datos del perfil',
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
                    throw new Error('Por favor, inicie sesión nuevamente para continuar');
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
                    title: 'Error',
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
                title: 'Éxito',
                description: 'Su perfil ha sido actualizado correctamente',
            });
        } catch (error) {
            console.error('Erreur lors de la mise à jour du profil:', error);
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Ocurrió un error al actualizar el perfil',
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
                <p className="text-sm text-muted-foreground">Cargando su perfil...</p>
            </div>
        );
    }

    if (!userData) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No se pudo cargar el perfil</h3>
                <p className="text-muted-foreground mb-6">Ocurrió un error al cargar su información</p>
                <Button onClick={loadProfile}>
                    Reintentar
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-8">
            {/* En-tête */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Mi Perfil</h1>
                    <p className="text-muted-foreground mt-1">
                        Gestione la información de su cuenta profesional
                    </p>
                </div>
                <Button onClick={handleOpenDialog} size="lg">
                    <Edit className="h-4 w-4 mr-2" />
                    Editar perfil
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
                                {userData.statutCompte === 'ACTIF' ? 'Activo' : 'Inactivo'}
                            </Badge>
                            <Badge variant="outline" className="gap-1">
                                <CreditCard className="h-3 w-3" />
                                {userData.typeCompte === 'POSTPAYE' ? 'Pago posterior' : 'Prepago'}
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
                        Información de la empresa
                    </CardTitle>
                    <CardDescription>
                        {lastSaved && (
                            <span className="text-xs">
                Última modificación el {formatDate(lastSaved)}
              </span>
                        )}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                Razón social
                            </p>
                            <p className="text-sm font-semibold">{userData.raisonSociale}</p>
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Globe className="h-4 w-4" />
                                Sector de actividad
                            </p>
                            <p className="text-sm font-semibold">{userData.secteurActivite}</p>
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                Correo electrónico
                            </p>
                            <p className="text-sm font-semibold">{userData.email}</p>
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                Teléfono
                            </p>
                            <p className="text-sm font-semibold">{userData.telephone}</p>
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                Ciudad
                            </p>
                            <p className="text-sm font-semibold">{userData.ville}</p>
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                Dirección
                            </p>
                            <p className="text-sm font-semibold">{userData.adresse}</p>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <p className="text-sm font-medium text-muted-foreground">Emisor SMS</p>
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
                        Información regulatoria
                    </CardTitle>
                    <CardDescription>
                        Esta información no puede ser modificada directamente
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">NIF (Número de Identificación Fiscal)</p>
                            <p className="text-sm font-semibold">{userData.nif || 'No proporcionado'}</p>
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">RCCM (Registro de Comercio)</p>
                            <p className="text-sm font-semibold">{userData.rccm || 'No proporcionado'}</p>
                        </div>
                    </div>

                    <Separator className="my-6" />

                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                            Para modificar su información regulatoria (NIF, RCCM), por favor contacte al servicio al cliente.
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
                            Modificar información
                        </DialogTitle>
                        <DialogDescription>
                            Actualice su información profesional. Los campos marcados con * son obligatorios.
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
                                                Razón social *
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    disabled={saving}
                                                    placeholder="Nombre de su empresa"
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
                                                Sector de actividad *
                                            </FormLabel>
                                            <Select 
                                                onValueChange={field.onChange} 
                                                defaultValue={field.value}
                                                disabled={saving}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Seleccione un sector de actividad" />
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
                                                Correo electrónico *
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    type="email"
                                                    disabled={saving}
                                                    placeholder="contacto@empresa.com"
                                                />
                                            </FormControl>
                                            <FormDescription className="text-xs">
                                                Utilizado para notificaciones importantes
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
                                                Teléfono *
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    disabled={saving}
                                                    placeholder="+241 XX XXX XXX"
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
                                                Ciudad *
                                            </FormLabel>
                                            <Select 
                                                onValueChange={field.onChange} 
                                                defaultValue={field.value}
                                                disabled={saving}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Seleccione una ciudad" />
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
                                                Dirección *
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    disabled={saving}
                                                    placeholder="Dirección completa"
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
                                            <FormLabel>Emisor SMS</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    disabled={saving}
                                                    placeholder="Nombre mostrado al enviar SMS"
                                                    maxLength={11}
                                                />
                                            </FormControl>
                                            <FormDescription className="text-xs">
                                                Este nombre aparecerá como remitente de sus SMS (máximo 11 caracteres)
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
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={saving}
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4 mr-2" />
                                        Guardar cambios
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
};