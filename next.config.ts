/** @type {import('next').NextConfig} */
const nextConfig = {
 async rewrites() {
  return [

    {
      source: "/api/user/:path*",
      destination: "https://apis.yesgobus.com/api/user/:path*",
    },

    {
      source: "/api/:path*",
      destination: "https://apis.yesgobus.com/api/:path*",
    },

       {
         source: "/ezee/:path*",
         destination: "https://apis.yesgobus.com/:path*",
       }
  ];
 }
};

export default nextConfig;