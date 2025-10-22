"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Loader2, Save, X, Building2, MapPin, Phone, Mail, Globe } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { fetchUserProfile, updateUserProfile, type UserProfile } from "@/lib/api/user";

const profileFormSchema = z.object({
  raisonSociale: z
      .string()
      .min(2, { message: "La raison sociale doit contenir au moins 2 caractères." })
      .max(100, { message: "La raison sociale ne peut pas dépasser 100 caractères." }),
  secteurActivite: z
      .string()
      .min(2, { message: "Le secteur d'activité doit contenir au moins 2 caractères." })
      .max(100, { message: "Le secteur d'activité ne peut pas dépasser 100 caractères." }),
  ville: z
      .string()
      .min(2, { message: "La ville doit contenir au moins 2 caractères." })
      .max(50, { message: "La ville ne peut pas dépasser 50 caractères." }),
  adresse: z.string().max(200, { message: "L'adresse ne peut pas dépasser 200 caractères." }),
  telephone: z
      .string()
      .min(8, { message: "Le numéro de téléphone doit contenir au moins 8 chiffres." })
      .regex(/^[0-9+\s-]+$/, { message: "Format de numéro de téléphone invalide" }),
  email: z.string().email({ message: "Veuillez entrer une adresse email valide." }).toLowerCase(),
  emetteur: z
      .string()
      .min(2, { message: "L'émetteur doit contenir au moins 2 caractères." })
      .max(11, { message: "L'émetteur SMS ne peut pas dépasser 11 caractères." }),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function EditProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState<UserProfile | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      raisonSociale: "",
      secteurActivite: "",
      ville: "",
      adresse: "",
      telephone: "",
      email: "",
      emetteur: "",
    },
    mode: "onChange",
  });

  const loadProfile = async () => {
    try {
      setLoading(true);
      const user = JSON.parse(localStorage?.getItem("user") || "{}");
      const clientId = user?.clientId || "700001";
      const data = await fetchUserProfile(clientId);
      setUserData(data);

      form.reset({
        raisonSociale: data.raisonSociale || "",
        secteurActivite: data.secteurActivite || "",
        ville: data.ville || "",
        adresse: data.adresse || "",
        telephone: data.telephone || "",
        email: data.email || "",
        emetteur: data.emetteur || "",
      });
    } catch (error) {
      console.error("Erreur lors du chargement du profil:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les informations du profil",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (data: ProfileFormValues) => {
    if (!userData) return;

    try {
      setSaving(true);
      const updatedProfile = await updateUserProfile(userData.idclients, {
        ...data,
        telephone: data.telephone.trim(),
      });

      const user = JSON.parse(localStorage?.getItem("user") || "{}");
      localStorage?.setItem("user", JSON.stringify({
        ...user,
        email: updatedProfile.email,
        name: updatedProfile.raisonSociale,
      }));

      toast({
        title: "Succès",
        description: "Votre profil a été mis à jour avec succès",
      });

      router.push("/dashboard/profil");
    } catch (error) {
      console.error("Erreur lors de la mise à jour du profil:", error);
      toast({
        title: "Erreur",
        description:
            error instanceof Error
                ? error.message
                : "Une erreur est survenue lors de la mise à jour du profil",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
      <div className="space-y-6 max-w-4xl mx-auto pb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Modifier le profil</h1>
            <p className="text-muted-foreground mt-1">Mettez à jour vos informations professionnelles</p>
          </div>
          <Button variant="outline" onClick={() => router.push("/dashboard/profil")} disabled={saving}>
            <X className="h-4 w-4 mr-2" />
            Annuler
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informations de l'entreprise</CardTitle>
            <CardDescription>Les champs marqués d'un * sont obligatoires.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
                <div className="flex flex-col items-center justify-center h-40 space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Chargement du formulaire...</p>
                </div>
            ) : (
                <Form {...form}>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                          control={form.control}
                          name="raisonSociale"
                          render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  <Building2 className="h-4 w-4" /> Raison sociale *
                                </FormLabel>
                                <FormControl>
                                  <Input {...field} disabled={saving} placeholder="Nom de votre entreprise" />
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
                                  <Globe className="h-4 w-4" /> Secteur d'activité *
                                </FormLabel>
                                <FormControl>
                                  <Input {...field} disabled={saving} placeholder="Ex: Commerce, Services, Industrie" />
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
                                <FormLabel className="flex items-center gap-2">
                                  <Mail className="h-4 w-4" /> Email *
                                </FormLabel>
                                <FormControl>
                                  <Input {...field} type="email" disabled={saving} placeholder="contact@entreprise.com" />
                                </FormControl>
                                <FormDescription className="text-xs">Utilisé pour les notifications importantes</FormDescription>
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
                                  <Phone className="h-4 w-4" /> Téléphone *
                                </FormLabel>
                                <FormControl>
                                  <Input {...field} disabled={saving} placeholder="+241 XX XX XX XX" />
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
                                  <MapPin className="h-4 w-4" /> Ville *
                                </FormLabel>
                                <FormControl>
                                  <Input {...field} disabled={saving} placeholder="Libreville" />
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
                                <FormLabel className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4" /> Adresse *
                                </FormLabel>
                                <FormControl>
                                  <Input {...field} disabled={saving} placeholder="Adresse complète" />
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
                                  <Input {...field} disabled={saving} placeholder="Nom affiché lors de l'envoi de SMS" maxLength={11} />
                                </FormControl>
                                <FormDescription className="text-xs">Ce nom apparaîtra comme expéditeur de vos SMS (maximum 11 caractères)</FormDescription>
                                <FormMessage />
                              </FormItem>
                          )}
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <Button type="button" variant="outline" onClick={() => router.push("/dashboard/profil")} disabled={saving}>
                        <X className="h-4 w-4 mr-2" /> Annuler
                      </Button>
                      <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={saving || !form.formState.isValid}>
                        {saving ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enregistrement...
                            </>
                        ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" /> Enregistrer
                            </>
                        )}
                      </Button>
                    </div>
                  </div>
                </Form>
            )}
          </CardContent>
        </Card>
      </div>
  );
}