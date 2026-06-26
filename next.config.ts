/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export is for production (Vercel). In dev, `output: "export"` breaks
  // dynamic routes and conflicts with middleware, causing JSON parse 500s.
  ...(process.env.NODE_ENV === "production" ? { output: "export" as const } : {}),
};

module.exports = nextConfig;