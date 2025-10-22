'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { Toaster } from "sonner";
import { resetPassword } from "@/lib/api/auth";
import Link from 'next/link';
import Image from 'next/image';
import { Lock, ShieldCheck, Key, Eye, EyeOff } from 'lucide-react';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();
  
  // Récupérer le token depuis l'URL si présent
  useEffect(() => {
    // Vérifier si nous sommes dans un navigateur
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('token');
      
      console.log('Token extrait de l\'URL:', urlToken);
      
      if (!urlToken) {
        console.error('Aucun token trouvé dans l\'URL');
        setIsValidToken(false);
        toast({
          variant: "destructive",
          title: "Lien invalide",
          description: "Le lien de réinitialisation est invalide ou a expiré.",
        });
        router.push('/forgot-password');
        return;
      }
      
      // Vérifier le format du token (au moins 10 caractères)
      if (urlToken.length < 10) {
        console.error('Token trop court:', urlToken);
        setIsValidToken(false);
        toast({
          variant: "destructive",
          title: "Lien invalide",
          description: "Le format du lien de réinitialisation est incorrect.",
        });
        router.push('/forgot-password');
        return;
      }
      
      // Si on arrive ici, le token semble valide
      console.log('Token valide détecté');
      setToken(urlToken);
      setIsValidToken(true);
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation des champs
    if (!password || !confirmPassword) {
      toast({
        variant: "destructive",
        title: "Champs manquants",
        description: "Veuillez remplir tous les champs.",
      });
      return;
    }

    // Vérification de la correspondance des mots de passe
    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Erreur de correspondance",
        description: "Les mots de passe ne correspondent pas. Veuillez les saisir à nouveau.",
      });
      return;
    }

    // Vérification du token
    if (!token) {
      console.error('[reset-password] Aucun token disponible pour la réinitialisation');
      toast({
        variant: "destructive",
        title: "Lien invalide",
        description: "Le lien de réinitialisation est incomplet. Veuillez réessayer ou demander un nouveau lien.",
      });
      router.push('/forgot-password');
      return;
    }

    // Vérification de la longueur du mot de passe
    if (password.length < 8) {
      toast({
        variant: "destructive",
        title: "Mot de passe trop court",
        description: "Le mot de passe doit contenir au moins 8 caractères.",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('[reset-password] Tentative de réinitialisation avec le token:', token.substring(0, 15) + '...');
      
      const response = await resetPassword(token, password);
      console.log('[reset-password] Réponse de l\'API:', response);
      
      // Afficher un message de succès
      toast({
        title: "Mot de passe mis à jour",
        description: "Votre mot de passe a été réinitialisé avec succès. Redirection vers la page de connexion...",
      });
      
      // Rediriger vers la page de connexion après un court délai
      setTimeout(() => {
        router.push('/login');
      }, 2000);
      
    } catch (error: any) {
      console.error('[reset-password] Erreur lors de la réinitialisation:', {
        message: error.message,
        name: error.name,
        status: error.status,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        response: error.response
      });
      
      // Gestion des erreurs spécifiques
      let errorTitle = 'Erreur';
      let errorMessage = "Une erreur inattendue est survenue. Veuillez réessayer plus tard.";
      
      // Si l'erreur contient un message, on l'utilise
      if (error.message) {
        errorMessage = error.message;
      }
      
      // Traitement des erreurs spécifiques
      if (error.status === 400) {
        errorTitle = 'Format invalide';
        errorMessage = "Le format du mot de passe ne respecte pas les exigences de sécurité. Utilisez au moins 8 caractères avec des chiffres et des lettres.";
      } 
      else if (error.status === 401) {
        errorTitle = 'Lien expiré';
        errorMessage = "Le lien de réinitialisation a expiré ou n'est plus valide. Veuillez en demander un nouveau.";
      }
      else if (error.status === 500) {
        errorTitle = 'Erreur serveur';
        errorMessage = "Une erreur est survenue sur le serveur. Veuillez réessayer plus tard.";
      }
      // Gestion des erreurs réseau
      else if (error.message && (error.message.includes('network') || error.message.includes('connexion'))) {
        errorTitle = 'Problème de connexion';
        errorMessage = "Impossible de se connecter au serveur. Vérifiez votre connexion Internet et réessayez.";
      }
      
      console.warn(`[reset-password] Affichage de l'erreur à l'utilisateur: ${errorTitle} - ${errorMessage}`);
      
      // Afficher l'erreur à l'utilisateur
      toast({
        variant: "destructive",
        title: errorTitle,
        description: errorMessage,
        duration: 10000, // 10 secondes
      });
      
      // Si le token est invalide, rediriger vers la page de demande de réinitialisation
      if (error.status === 401) {
        setTimeout(() => {
          router.push('/forgot-password');
        }, 3000);
      }
      
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidToken === null) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white md:bg-gradient-to-br md:from-[#0171BB] md:to-[#8DC73C]">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Vérification du lien de réinitialisation...</p>
        </div>
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white md:bg-gradient-to-br md:from-[#0171BB] md:to-[#8DC73C]">
        <div className="text-center p-8 max-w-md w-full bg-white rounded-lg shadow-lg">
          <div className="bg-red-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Lock className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Lien invalide</h2>
          <p className="text-gray-600 mb-6">Le lien de réinitialisation est invalide ou a expiré.</p>
          <Link 
            href="/forgot-password" 
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#0171BB] hover:bg-[#015a96] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Key className="mr-2 h-4 w-4" />
            Demander un nouveau lien
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster />
      <div className="h-screen w-screen flex items-center justify-center bg-white md:bg-gradient-to-br md:from-[#0171BB] md:to-[#8DC73C] p-0 m-0 overflow-hidden">
        <div className="w-full h-full bg-white flex flex-col md:flex-row">
          {/* Section gauche - Branding - Cachée sur mobile */}
          <div className="hidden md:flex bg-[#0072BB] text-white p-8 flex-col justify-center items-center text-center md:w-1/2 h-full">
            <div className="bg-white/20 p-6 rounded-2xl mb-8">
              <Lock className="w-16 h-16 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-4">Nouveau mot de passe</h1>
            <p className="text-blue-100 mb-8">Créez un mot de passe sécurisé pour votre compte</p>
            
            <div className="space-y-4 w-full max-w-xs">
              <div className="flex items-center space-x-3 bg-white/10 p-3 rounded-lg">
                <div className="bg-white/20 p-2 rounded-lg">
                  <ShieldCheck className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm">Sécurité renforcée</span>
              </div>
              
              <div className="flex items-center space-x-3 bg-white/10 p-3 rounded-lg">
                <div className="bg-white/20 p-2 rounded-lg">
                  <Key className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm">Chiffrement de bout en bout</span>
              </div>
            </div>
          </div>
          
          {/* Section droite - Formulaire */}
          <div className="p-6 md:p-12 flex flex-col justify-center items-center w-full md:w-1/2 h-full">
            <div className="w-full max-w-md">
              <div className="flex justify-center mb-8">
                <div className="relative w-32 h-32">
                  <Image
                    src="/Logo_ION-1-removebg-preview 1.png"
                    alt="Logo SMS Gateway"
                    width={128}
                    height={128}
                    className="object-contain w-full h-full"
                    priority
                  />
                </div>
              </div>
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Réinitialiser le mot de passe</h2>
                <p className="text-gray-500">Entrez votre nouveau mot de passe ci-dessous</p>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Nouveau mot de passe
                  </Label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                      aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Confirmez le mot de passe
                  </Label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                      aria-label={showConfirmPassword ? "Masquer la confirmation du mot de passe" : "Afficher la confirmation du mot de passe"}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>    
                <Button
                  type="submit"
                  className="w-full py-6 bg-[#0171BB] hover:bg-[#015a96] text-white font-medium rounded-lg transition-colors duration-200"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Réinitialisation en cours...
                    </>
                  ) : (
                    'Réinitialiser le mot de passe'
                  )}
                </Button>
                
                <div className="text-center text-sm">
                  <Link 
                    href="/login" 
                    className="font-medium text-blue-600 hover:text-blue-500"
                  >
                    Retour à la page de connexion
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
