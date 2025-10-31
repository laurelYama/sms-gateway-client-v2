'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { forgotPassword } from "@/lib/api/auth";
import Link from 'next/link';
import Image from 'next/image';
import { MessageCircle, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Por favor, introduzca su dirección de correo electrónico.');
      return;
    }

    setIsLoading(true);

    try {
      await forgotPassword(email);
      
      toast.success('Se ha enviado un correo electrónico con las instrucciones para restablecer su contraseña.');
      
      // Redirigir a la página de inicio de sesión después de un breve retraso
      setTimeout(() => {
        router.push('/login');
      }, 3000);
      
    } catch (error: any) {
      console.error('Error al solicitar el restablecimiento de contraseña:', error);
      
      let errorMessage = 'Se produjo un error al solicitar el restablecimiento de contraseña.';
      
      if (error.message?.includes('user not found')) {
        errorMessage = 'No se encontró ninguna cuenta con este correo electrónico.';
      } else if (error.message?.includes('too many requests')) {
        errorMessage = 'Demasiados intentos. Por favor, espere antes de intentar de nuevo.';
      }
      
      toast.error(errorMessage);
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
            <MessageCircle className="w-16 h-16 text-white mx-auto" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Restablecer Contraseña</h1>
          <p className="text-blue-100 mb-8">Ingrese su dirección de correo electrónico para recibir un enlace de restablecimiento</p>
          
          <div className="space-y-4 w-full max-w-xs">
            <div className="flex items-center space-x-3 bg-white/10 p-3 rounded-lg">
              <div className="bg-white/20 p-2 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <span className="text-sm">Enlace de restablecimiento por correo</span>
            </div>
            
            <div className="flex items-center space-x-3 bg-white/10 p-3 rounded-lg">
              <div className="bg-white/20 p-2 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <span className="text-sm">Seguridad mejorada</span>
            </div>
            
            <div className="flex items-center space-x-3 bg-white/10 p-3 rounded-lg">
              <div className="bg-white/20 p-2 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <span className="text-sm">Protección de cuenta</span>
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
                <h2 className="text-2xl font-bold text-gray-800 mb-2">¿Olvidó su contraseña?</h2>
                <p className="text-gray-500">Ingrese su correo electrónico para recibir un enlace de restablecimiento</p>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700">Correo electrónico</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="ejemplo@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="py-6 px-4 border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
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
                      Enviando...
                    </>
                  ) : (
                    'Enviar enlace de restablecimiento'
                  )}
                </Button>
                
                <div className="text-center text-sm">
                  <Link 
                    href="/login" 
                    className="font-medium text-blue-600 hover:text-blue-500 flex items-center justify-center space-x-1"
                  >
                    <span>Volver al inicio de sesión</span>
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
  );
}
