import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    if (!token) {
      const url = new URL('/forgot-password', request.nextUrl.origin);
      url.searchParams.set('error', 'invalid_token');
      return NextResponse.redirect(url);
    }
    
    // Créer l'URL de redirection
    const redirectUrl = new URL('/reset-password', request.nextUrl.origin);
    redirectUrl.searchParams.set('token', token);
    
    // Rediriger vers la page de réinitialisation avec le token
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Error in reset route:', error);
    const url = new URL('/forgot-password', request.nextUrl.origin);
    url.searchParams.set('error', 'server_error');
    return NextResponse.redirect(url);
  }
}
