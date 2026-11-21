import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: '/link-in-bio/:path*', destination: '/bio/:path*', permanent: true }];
  },
  serverExternalPackages: ['sharp'],
  /**
   * Immagini non ottimizzate dal server: `/_next/image` richiede `sharp`, che
   * non gira su Workers, o il binding Cloudflare Images a consumo. Le foto
   * caricate dal gestionale sono già ridimensionate a 1600 px in WebP dal
   * browser (`src/lib/optimize-upload.ts`), quindi il risparmio sarebbe
   * marginale e il costo in binding non giustificato.
   */
  images: {
    unoptimized: true,
  },
};

/**
 * Sentry avvolge la build per caricare le source map leggibili.
 * Senza SENTRY_AUTH_TOKEN (o senza SENTRY_ORG/PROJECT) l'upload viene saltato:
 * l'app funziona e la build non si blocca, si perdono solo le righe di codice
 * negli stack trace di Sentry.
 */
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  telemetry: false,
  widenClientFileUpload: false,
  suppressOnRouterTransitionStartWarning: true,
  errorHandler: (error) => {
    console.warn(`[sentry] build: ${error.message}`);
  },
});
