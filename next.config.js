/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Configuration des rewrites pour le proxy
  async rewrites() {
    return [
      // Laisser passer les routes API du frontend
      {
        source: '/api/reset',
        destination: '/api/reset',
      },
      // Laisser passer les fichiers statiques
      {
        source: '/Documentation-SMS-Gateway.pdf',
        destination: '/Documentation-SMS-Gateway.pdf',
      },
      // Toutes les autres requêtes API vers le backend en production
      {
        source: '/api/:path*',
        destination: 'https://api-smsgateway.solutech-one.com/api/V1/:path*',
      },
    ];
  },
  
  // Configuration des en-têtes CORS
  async headers() {
    return [
      {
        // Appliquer ces en-têtes à toutes les routes
        source: '/(.*)',
        headers: [
          { 
            key: 'Access-Control-Allow-Origin', 
            value: '*', // Dans un environnement de production, spécifiez votre domaine ici
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'X-Requested-With, Content-Type, Authorization',
          },
          { 
            key: 'X-Content-Type-Options', 
            value: 'nosniff' 
          },
          { 
            key: 'X-Frame-Options', 
            value: 'DENY' 
          },
          { 
            key: 'X-XSS-Protection', 
            value: '1; mode=block' 
          },
        ],
      },
    ];
  },
  
  // Configuration du serveur de développement
  webpack: (config) => {
    config.resolve.fallback = {
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
  
  // Désactiver les vérifications en développement
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  
  // Activer les logs de débogage
  logging: {
    fetches: { fullUrl: true },
  }
};

module.exports = nextConfig;
