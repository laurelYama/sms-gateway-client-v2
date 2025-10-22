'use client';

import { Button } from "./button";
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (response.ok) {
        // Supprimer les cookies côté client
        document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = 'user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        
        // Rediriger vers la page de connexion
        router.push('/login');
        router.refresh(); // Forcer le rafraîchissement pour mettre à jour l'interface
        toast.success('Déconnexion réussie');
      } else {
        throw new Error('Échec de la déconnexion');
      }
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors de la déconnexion",
      });
    }
  };

  return (
    <Button 
      variant="ghost"
      onClick={handleLogout}
      className="text-red-600 hover:bg-red-50 hover:text-red-700"
    >
      Déconnexion
    </Button>
  );
}
