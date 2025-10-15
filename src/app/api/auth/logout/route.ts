import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Créer une réponse de succès
    const response = NextResponse.json(
      { message: 'Déconnexion réussie' },
      { status: 200 }
    );

    // Supprimer les cookies d'authentification
    response.cookies.delete('authToken');
    response.cookies.delete('user');

    return response;
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error);
    return NextResponse.json(
      { message: 'Erreur lors de la déconnexion' },
      { status: 500 }
    );
  }
}
