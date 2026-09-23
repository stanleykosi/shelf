import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "digitalassets.pepsico.com", pathname: "/transform/**" },
      { protocol: "https", hostname: "images.ctfassets.net", pathname: "/oggad6svuzkv/**" },
      { protocol: "https", hostname: "www.apple.com", pathname: "/v/iphone/**" },
    ],
  },
  typedRoutes: true,
  experimental: {
    // Use TypeScript's compiler API so builds do not depend on parsing CLI output.
    useTypeScriptCli: false,
  },
  turbopack: {
    root: process.cwd(),
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
