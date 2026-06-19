import { createMDX } from "fumadocs-mdx/next"

/** @type {import("next").NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "**.tenki.sh",
  ],
  transpilePackages: ["@workspace/ui"],
}

const withMDX = createMDX()

export default withMDX(nextConfig)
