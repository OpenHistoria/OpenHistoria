import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "**.tenki.sh",
    "openhistoria-drag--11zlzh.eu.sb.tenki.sh",
  ],
  transpilePackages: ["@workspace/ui", "@workspace/engine"],
}

export default nextConfig
