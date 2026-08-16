import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // DuckDB is a native module (used to query campaign-finance parquet files).
  // Keep Next from bundling it and its per-platform bindings — they must be
  // required from node_modules at runtime (Railway = linux-x64).
  serverExternalPackages: [
    "@duckdb/node-api",
    "@duckdb/node-bindings",
    "@duckdb/node-bindings-linux-x64",
    "@duckdb/node-bindings-linux-arm64",
    "@duckdb/node-bindings-darwin-x64",
    "@duckdb/node-bindings-darwin-arm64",
    "@duckdb/node-bindings-win32-x64",
  ],
};

export default nextConfig;
