import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "**.tenki.sh",
    "**.sb.tenki.sh",
    "**.sb-stg.tenki.sh",
  ],
  transpilePackages: [
    "@workspace/ui",
    "@workspace/engine",
    "@workspace/detective-engine",
    "@workspace/adventure-engine",
    "@workspace/seduction-engine",
  ],
}

export default nextConfig
