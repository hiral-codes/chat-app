import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins:["http://localhost:3000","http://192.168.1.14:3000"]
};

export default nextConfig;
