/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Configuration CORS pour gérer les cookies
  async headers() {
    return [
      // Configuration pour les requêtes API
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: 'http://localhost:3000' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,PATCH,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      },
      // Configuration pour les requêtes OPTIONS (pré-vol)
      {
        source: '/api/:path*',
        has: [
          {
            type: 'header',
            key: 'access-control-request-method',
            value: '(.*)',
          },
        ],
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'http://localhost:3000' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, PATCH, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
        ],
      },
      // En-têtes de sécurité pour toutes les routes
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
  
  // Désactivation du proxy en faveur d'un appel direct à l'API
  // car nous utilisons maintenant l'URL complète dans config.ts
  async rewrites() {
    return [];
  },
  
  // Configuration du serveur de développement
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
  
  // Désactiver la vérification de type TypeScript pendant la construction
  typescript: {
    ignoreBuildErrors: true,
  },
  // Désactiver la vérification ESLint pendant la construction
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Activer les logs de débogage
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

// Configuration du proxy pour le développement
if (process.env.NODE_ENV === 'development') {
  const { createProxyMiddleware } = require('http-proxy-middleware');
  
  module.exports = {
    ...nextConfig,
    async server() {
      return {
        ...nextConfig.server,
        proxy: {
          '/api': {
            target: 'https://api-smsgateway.solutech-one.com',
            changeOrigin: true,
            secure: false,
            pathRewrite: {
              '^/api': '/api/V1',
            },
            onProxyReq: (proxyReq, req, res) => {
              console.log('Proxy Request:', {
                url: req.url,
                method: req.method,
                headers: req.headers,
              });
            },
            onProxyRes: (proxyRes, req, res) => {
              console.log('Proxy Response:', {
                statusCode: proxyRes.statusCode,
                statusMessage: proxyRes.statusMessage,
                headers: proxyRes.headers,
              });
            },
            onError: (err, req, res) => {
              console.error('Proxy Error:', err);
              res.status(500).json({ error: 'Proxy Error', details: err.message });
            }
          }
        }
      };
    },
  };
} else {
  module.exports = nextConfig;
}
