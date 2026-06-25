/** @type {import('next').NextConfig} */
const nextConfig = {
 async rewrites() {
  return [
    // 1. Send ALL user/auth requests to the production API (apis.yesgobus.com)
    {
      source: "/api/user/:path*",
      destination: "https://apis.yesgobus.com/api/user/:path*",
    },
    // 2. Send everything else to the test API (test.yesgobus.com)
    {
      source: "/api/:path*",
      destination: "https://test.yesgobus.com/api/:path*",
    },
    // 3. Ezee routes
       {
         source: "/ezee/:path*",
         destination: "https://test.yesgobus.com/:path*",
       }
  ];
 }
};

export default nextConfig;