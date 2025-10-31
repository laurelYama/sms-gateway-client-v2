'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
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
        console.error('No se encontró ningún token en la URL');
        setIsValidToken(false);
        toast.error('El enlace de restablecimiento no es válido o ha expirado.');
        router.push('/forgot-password');
        return;
      }
      
      // Vérifier le format du token (au moins 10 caractères)
      if (urlToken.length < 10) {
        console.error('Token demasiado corto:', urlToken);
        setIsValidToken(false);
        toast.error('El formato del enlace de restablecimiento es incorrecto.');
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
    
    // Validación de campos
    if (!password || !confirmPassword) {
      toast.error('Por favor, complete todos los campos.');
      return;
    }

    // Verificación de coincidencia de contraseñas
    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden. Por favor, inténtelo de nuevo.');
      return;
    }

    // Verificación del token
    if (!token) {
      console.error('[reset-password] No hay token disponible para el restablecimiento');
      toast.error('El enlace de restablecimiento está incompleto. Por favor, intente de nuevo o solicite un nuevo enlace.');
      router.push('/forgot-password');
      return;
    }

    // Verificación de la longitud de la contraseña
    if (password.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('[reset-password] Tentative de réinitialisation avec le token:', token.substring(0, 15) + '...');
      
      const response = await resetPassword(token, password);
      console.log('[reset-password] Réponse de l\'API:', response);
      
      // Mostrar mensaje de éxito
      toast.success('Su contraseña ha sido restablecida con éxito. Redirigiendo a la página de inicio de sesión...');
      
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
      
      // Manejo de errores específicos
      let errorMessage = "Ha ocurrido un error inesperado. Por favor, inténtelo de nuevo más tarde.";
      
      // Si el error tiene un mensaje, lo usamos
      if (error.message) {
        errorMessage = error.message;
      }
      
      // Procesamiento de errores específicos
      if (error.status === 400) {
        errorMessage = "El formato de la contraseña no cumple con los requisitos de seguridad. Utilice al menos 8 caracteres con números y letras.";
      } 
      else if (error.status === 401) {
        errorMessage = "El enlace de restablecimiento ha expirado o ya no es válido. Por favor, solicite uno nuevo.";
      }
      else if (error.status === 500) {
        errorMessage = "Se ha producido un error en el servidor. Por favor, inténtelo de nuevo más tarde.";
      }
      // Manejo de errores de red
      else if (error.message && (error.message.includes('network') || error.message.includes('conexión'))) {
        errorMessage = "No se pudo conectar al servidor. Verifique su conexión a Internet e intente de nuevo.";
      }
      
      console.warn(`[reset-password] Mostrando error al usuario: ${errorMessage}`);
      
      // Mostrar el error al usuario
      toast.error(errorMessage, { duration: 10000 });
      
      // Si el token no es válido, redirigir a la página de solicitud de restablecimiento
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
          <p className="mt-4 text-gray-600">Verificando enlace de restablecimiento...</p>
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Enlace inválido</h2>
          <p className="text-gray-600 mb-6">El enlace de restablecimiento no es válido o ha expirado.</p>
          <Link 
            href="/forgot-password" 
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#0171BB] hover:bg-[#015a96] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Key className="mr-2 h-4 w-4" />
            Solicitar un nuevo enlace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-screen w-screen flex items-center justify-center bg-white md:bg-gradient-to-br md:from-[#0171BB] md:to-[#8DC73C] p-0 m-0 overflow-hidden">
        <div className="w-full h-full bg-white flex flex-col md:flex-row">
          {/* Section gauche - Branding - Cachée sur mobile */}
          <div className="hidden md:flex bg-[#0072BB] text-white p-8 flex-col justify-center items-center text-center md:w-1/2 h-full">
            <div className="bg-white/20 p-6 rounded-2xl mb-8">
              <Lock className="w-16 h-16 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-4">Nueva contraseña</h1>
            <p className="text-blue-100 mb-8">Cree una contraseña segura para su cuenta</p>
            
            <div className="space-y-4 w-full max-w-xs">
              <div className="flex items-center space-x-3 bg-white/10 p-3 rounded-lg">
                <div className="bg-white/20 p-2 rounded-lg">
                  <ShieldCheck className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm">Seguridad mejorada</span>
              </div>
              
              <div className="flex items-center space-x-3 bg-white/10 p-3 rounded-lg">
                <div className="bg-white/20 p-2 rounded-lg">
                  <Key className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm">Cifrado de extremo a extremo</span>
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
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Restablecer contraseña</h2>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Nueva contraseña
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
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
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
                    Confirmar contraseña
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
                      aria-label={showConfirmPassword ? "Ocultar confirmación de contraseña" : "Mostrar confirmación de contraseña"}
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
                      Restableciendo contraseña...
                    </>
                  ) : (
                    'Restablecer contraseña'
                  )}
                </Button>
                
                <div className="text-center text-sm">
                  <Link 
                    href="/login" 
                    className="font-medium text-blue-600 hover:text-blue-500"
                  >
                    Volver al inicio de sesión
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
