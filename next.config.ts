import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['sharp'],
  images: {
    remotePatterns: [{
      protocol: 'https',
      hostname: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://oieqtrfeoyfabyjirrqa.supabase.co').hostname,
      pathname: '/storage/v1/object/public/**',
    }],
  },
};

export default nextConfig;
