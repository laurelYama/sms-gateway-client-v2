'use client';

import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, MessageCircle } from 'lucide-react';
import Cookies from 'js-cookie';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { toast } from "sonner";
import { useRouter } from 'next/navigation';
import { API_CONFIG } from "@/lib/config";

interface UserData {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  role: string;
  typeCompte: string;
  statutCompte: string;
  iat?: number;
  exp?: number;
}

interface ApiResponse {
  message?: string;
  data?: {
    token: string;
    user: UserData;
  };
}

export default function LoginPage() {
  const router = useRouter();
  
  // Vérifier si l'utilisateur est déjà connecté
  useEffect(() => {
    const checkAuth = () => {
      // Ne vérifier que côté client
      if (typeof window === 'undefined') return;
      
      const token = Cookies.get('authToken');
      const user = Cookies.get('user');
      
      if (!token || !user) return;
      
      try {
        const userData = JSON.parse(user);
        
        // Vérifier si l'utilisateur a les champs requis
        if (!userData.id || !userData.email) {
          console.log('[Login] Données utilisateur incomplètes, nettoyage des cookies');
          Cookies.remove('authToken');
          Cookies.remove('user');
          return;
        }
        
        // Vérifier si le token est expiré
        const now = Math.floor(Date.now() / 1000);
        if (userData.exp && userData.exp < now) {
          console.log('[Login] Token expiré, nettoyage des cookies');
          Cookies.remove('authToken');
          Cookies.remove('user');
          return;
        }
        
        // Si on arrive ici, l'utilisateur est valide et connecté
        console.log('[Login] Utilisateur déjà connecté, redirection vers /dashboard');
        router.push('/dashboard');
        
      } catch (e) {
        console.error('Erreur lors de la vérification de l\'authentification:', e);
        // En cas d'erreur, on nettoie pour être sûr
        Cookies.remove('authToken');
        Cookies.remove('user');
      }
    };
    
    // Laisser le temps au composant de se monter complètement
    const timer = setTimeout(checkAuth, 100);
    return () => clearTimeout(timer);
  }, [router]);

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Validation des champs
    if (!formData.email || !formData.password) {
      toast({
        variant: "destructive",
        title: "Champs manquants",
        description: "Veuillez remplir tous les champs obligatoires.",
      });
      setIsLoading(false);
      return;
    }
    
    // Réinitialiser les erreurs précédentes
    // La méthode dismiss n'est pas disponible sur l'objet toast retourné par useToast()

    try {
      console.log('Tentative de connexion avec:', formData);
      console.log('URL de connexion:', API_CONFIG.getLoginUrl());
      
      const response = await fetch(API_CONFIG.getLoginUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          motDePasse: formData.password,
        }),
        credentials: 'include',
      });

      console.log('Réponse du serveur - Statut:', response.status);
      
      let data: any;
      const responseText = await response.text();
      
      // Vérifier si la réponse est un succès (statut 2xx)
      if (!response.ok) {
        let errorMessage = 'Échec de la connexion';
        let errorTitle = 'Erreur de connexion';
        const errorCode = response.status;
        
        // Essayer d'extraire un message d'erreur du JSON
        if (responseText) {
          try {
            const errorData = JSON.parse(responseText);
            if (errorData.message) {
              errorMessage = errorData.message;
            }
            if (errorData.title) {
              errorTitle = errorData.title;
            }
          } catch (e) {
            // Si le parsing échoue, utiliser le texte brut de la réponse
            errorMessage = responseText;
          }
        }
        
        // Messages d'erreur plus spécifiques selon le code d'état HTTP
        switch (errorCode) {
          case 400:
            errorMessage = 'Veuillez vérifier les informations saisies et réessayer.';
            errorTitle = 'Données invalides';
            break;
          case 401:
            errorMessage = 'Les identifiants fournis sont incorrects.';
            errorTitle = 'Échec de la connexion';
            break;
          case 403:
            errorMessage = 'Vous n\'êtes pas autorisé à accéder à cette ressource.';
            errorTitle = 'Accès refusé';
            break;
          case 404:
            errorMessage = 'Le service demandé est introuvable.';
            errorTitle = 'Service non trouvé';
            break;
          case 500:
            errorMessage = 'Une erreur inattendue est survenue. Veuillez réessayer plus tard.';
            errorTitle = 'Erreur du serveur';
            break;
          case 502:
          case 503:
          case 504:
            errorMessage = 'Le service est temporairement indisponible. Veuillez réessayer dans quelques instants.';
            errorTitle = 'Service indisponible';
            break;
        }
        
        // Afficher le toast d'erreur
        toast.error(errorMessage);
        
        // Ne pas lancer d'exception pour les erreurs courantes
        if (errorCode === 401 || errorCode === 400) {
          setIsLoading(false);
          return;
        }
        
        // Pour les autres erreurs, lancer une exception
        const error = new Error(errorMessage) as any;
        error.statusCode = errorCode;
        throw error;
      }
      
      // Si on arrive ici, la réponse est un succès, on peut parser le JSON
      try {
        data = responseText ? JSON.parse(responseText) : {};
        console.log('Réponse du serveur - Données:', data);
      } catch (e) {
        console.error('Erreur lors de l\'analyse de la réponse JSON:', e, 'Réponse brute:', responseText);
        throw new Error('Réponse invalide du serveur. Veuillez réessayer.');
      }

      // Vérifier si la réponse contient un token
      const token = data.token;
      
      if (!token) {
        console.error('Token manquant dans la réponse:', data);
        throw new Error(data.message || 'Réponse du serveur incomplète');
      }

      // Décoder le token JWT pour obtenir les informations utilisateur
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        throw new Error('Format de token invalide');
      }

      try {
        const decodedPayload = JSON.parse(atob(tokenParts[1]));
        const user = {
          id: decodedPayload.id,
          email: decodedPayload.sub,
          nom: decodedPayload.nom,
          prenom: decodedPayload.prenom || '',
          role: decodedPayload.role,
          typeCompte: decodedPayload.typeCompte,
          statutCompte: decodedPayload.statutCompte
        };

        // Vérifier le rôle de l'utilisateur
        if (user.role !== 'CLIENT_USER') {
          throw new Error('Accès non autorisé. Seuls les utilisateurs CLIENT_USER peuvent accéder à cette application.');
        }

        // Stocker le token et les informations utilisateur dans les cookies avec js-cookie
        const cookieOptions = {
          expires: 1, // 1 jour
          path: '/',
          sameSite: 'lax' as const,
          secure: window.location.protocol === 'https:',
          // Ne pas définir le domaine pour permettre le fonctionnement en localhost
          // domain: window.location.hostname
        };

        console.log('[AUTH] Définition des cookies avec options:', cookieOptions);
        
        // Définir les cookies avec les options
        Cookies.set('authToken', token, cookieOptions);
        
        // Stocker les informations utilisateur en supprimant les données sensibles
        const userData = {
          id: user.id,
          email: user.email,
          nom: user.nom,
          prenom: user.prenom,
          role: user.role,
          typeCompte: user.typeCompte,
          statutCompte: user.statutCompte
        };
        
        Cookies.set('user', JSON.stringify(userData), cookieOptions);
        
        // Définir également les cookies manuellement pour assurer la compatibilité
        document.cookie = `authToken=${token}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`;
        document.cookie = `user=${encodeURIComponent(JSON.stringify(userData))}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`;
        
        // Vérifier que les cookies ont bien été définis
        console.log('[AUTH] Cookies après définition:', {
          authToken: document.cookie.includes('authToken') ? 'DÉFINI' : 'NON DÉFINI',
          user: document.cookie.includes('user=') ? 'DÉFINI' : 'NON DÉFINI',
          allCookies: document.cookie
        });
      
        // Afficher le message de bienvenue avec un toast
        toast.success('Connexion réussie');
        
        // Vérifier s'il y a une URL de redirection dans l'URL
        const searchParams = new URLSearchParams(window.location.search);
        const redirectUrl = searchParams.get('redirect');
        
        // Rediriger vers l'URL de redirection si elle existe, sinon vers le tableau de bord
        const targetUrl = redirectUrl && redirectUrl.startsWith('/') 
          ? redirectUrl 
          : '/dashboard';
          
        console.log('Redirection après connexion vers:', targetUrl);
        router.push(targetUrl);
        router.refresh();
      } catch (e) {
        console.error('Erreur lors du décodage du token:', e);
        throw new Error('Erreur lors de la lecture des informations utilisateur');
      }
    } catch (error: any) {
      console.error('Erreur de connexion:', error);
      
      let errorMessage = 'Une erreur est survenue lors de la connexion';
      let errorTitle = 'Erreur de connexion';
      
      // Vérifier si c'est une erreur réseau
      if (error.message?.toLowerCase().includes('failed to fetch') || 
          error.message?.toLowerCase().includes('network request failed')) {
        errorMessage = 'Impossible de se connecter au serveur. Vérifiez votre connexion Internet et réessayez.';
        errorTitle = 'Erreur de réseau';
      } 
      // Vérifier le code d'état HTTP si disponible
      else if (error.statusCode) {
        switch (error.statusCode) {
          case 400:
            errorMessage = 'Requête invalide. Vérifiez les informations saisies.';
            errorTitle = 'Erreur de validation';
            break;
          case 401:
            errorMessage = 'Email ou mot de passe incorrect';
            errorTitle = 'Identifiants invalides';
            break;
          case 403:
            errorMessage = 'Accès refusé. Vous n\'avez pas les autorisations nécessaires.';
            errorTitle = 'Accès refusé';
            break;
          case 404:
            errorMessage = 'Service non trouvé. Veuillez contacter le support.';
            errorTitle = 'Service indisponible';
            break;
          case 500:
            errorMessage = 'Erreur interne du serveur. Veuillez réessayer plus tard.';
            errorTitle = 'Erreur du serveur';
            break;
          case 502:
          case 503:
          case 504:
            errorMessage = 'Service temporairement indisponible. Veuillez réessayer dans quelques instants.';
            errorTitle = 'Service indisponible';
            break;
        }
      }
      // Gestion des erreurs génériques
      else if (error instanceof Error) {
        // Essayer d'extraire un message d'erreur plus détaillé
        try {
          // Essayer de parser le message d'erreur comme JSON
          const errorData = JSON.parse(error.message);
          if (errorData.message) {
            errorMessage = errorData.message;
          }
          if (errorData.title) {
            errorTitle = errorData.title;
          }
        } catch (e) {
          // Si le parsing échoue, utiliser le message d'erreur brut
          errorMessage = error.message;
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // Nettoyer et formater le message d'erreur
      errorMessage = errorMessage
        .replace(/^Error: /, '') // Enlève le préfixe 'Error: ' si présent
        .replace(/^[\s\S]*<title>([^<]+)<\/title>[\s\S]*$/, '$1') // Extrait le titre d'une éventuelle page HTML
        .replace(/\s+/g, ' ') // Remplace les espaces multiples par un seul espace
        .trim()
        .substring(0, 500); // Limite la longueur du message
      
      // S'assurer que le message se termine par un point
      if (errorMessage.length > 0 && !/[.!?]$/.test(errorMessage)) {
        errorMessage += '.';
      }
      
      toast({
        variant: "destructive",
        title: errorTitle,
        description: errorMessage,
        action: (
          <ToastAction 
            altText="Réessayer" 
            onClick={handleSubmit}
          >
            Réessayer
          </ToastAction>
        ),
      });
      
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-white md:bg-gradient-to-br md:from-[#0171BB] md:to-[#8DC73C] p-0 m-0 overflow-hidden">
        <div className="w-full h-full bg-white flex flex-col md:flex-row">
          {/* Section gauche - Branding - Cachée sur mobile */}
          <div className="hidden md:flex bg-[#0072BB] text-white p-8 flex-col justify-center items-center text-center md:w-1/2 h-full">
            <div className="bg-white/20 p-6 rounded-2xl mb-8">
              <MessageCircle className="w-16 h-16 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-4">Bienvenue sur<br />SMS GATEWAY</h1>
            <p className="text-blue-100 mb-8">Votre plateforme sécurisée et fiable pour la gestion de vos SMS professionnels</p>
            
            <div className="space-y-4 w-full max-w-xs">
              <div className="flex items-center space-x-3 bg-white/10 p-3 rounded-lg">
                <div className="bg-white/20 p-2 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                  </svg>
                </div>
                <span className="text-sm">Envoi de SMS en masse</span>
              </div>
              
              <div className="flex items-center space-x-3 bg-white/10 p-3 rounded-lg">
                <div className="bg-white/20 p-2 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <span className="text-sm">Sécurité renforcée</span>
              </div>
              
              <div className="flex items-center space-x-3 bg-white/10 p-3 rounded-lg">
                <div className="bg-white/20 p-2 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <span className="text-sm">Suivi en temps réel</span>
              </div>
            </div>
          </div>
          
          {/* Section droite - Formulaire - Pleine largeur sur mobile */}
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
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Connexion</h2>
                <p className="text-gray-500">Entrez vos identifiants pour accéder à votre espace</p>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700">Adresse email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="exemple@email.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="py-6 px-4 border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="password" className="text-gray-700">Mot de passe</Label>
                    <Link href="/forgot-password" className="text-sm text-blue-600 hover:underline">
                      Mot de passe oublié ?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Entrez votre mot de passe"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      className="py-6 px-4 pr-12 border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                      aria-label={showPassword ? 'Cacher le mot de passe' : 'Afficher le mot de passe'}
                    >
                      {showPassword ? (
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
                      Connexion en cours...
                    </>
                  ) : (
                    'Se connecter'
                  )}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
  );
}
