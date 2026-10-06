import type { NextConfig } from "next";
import { buildEnv } from "./build-env.mjs";

const nextConfig: NextConfig = {
  env: buildEnv("servidor"),
};

export default nextConfig;
