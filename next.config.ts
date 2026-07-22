import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "tjidmybzyerxprlwkrmh.supabase.co",
      },
    ],
  },
};

export default nextConfig;
