import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: '/link-in-bio/:path*', destination: '/bio/:path*', permanent: true }];
  },
  serverExternalPackages: ['sharp'],
  images: {
    remotePatterns: [{
      protocol: 'https',
      hostname: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://oieqtrfeoyfabyjirrqa.supabase.co').hostname,
      pathname: '/storage/v1/object/public/**',
    }, {
      protocol: 'https',
      hostname: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://oieqtrfeoyfabyjirrqa.supabase.co').hostname,
      pathname: '/storage/v1/object/sign/factory-assets/publications/**',
    }],
  },
};

export default nextConfig;
