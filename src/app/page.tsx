import { redirect } from 'next/navigation';

export default function Home() {
  // Redirige vers la page de connexion
  redirect('/login');
  
  // Ce code ne sera jamais atteint, mais il est nécessaire pour le typage TypeScript
  return null;
}
