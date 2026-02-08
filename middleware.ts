import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;

  const wpHost = process.env.WORDPRESS_URL
    ? new URL(process.env.WORDPRESS_URL).hostname
    : "";

  // Content Security Policy
  const cspDirectives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:${wpHost ? ` https://${wpHost}` : ""}`,
    `font-src 'self' https://fonts.gstatic.com`,
    `connect-src 'self'${wpHost ? ` https://${wpHost}` : ""} https://va.vercel-scripts.com https://vitals.vercel-insights.com`,
    `frame-src 'self' https://www.youtube.com https://youtube.com https://player.vimeo.com`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];

  response.headers.set(
    "Content-Security-Policy",
    cspDirectives.join("; ")
  );

  // Security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );

  // Aggressive caching for OG images
  if (pathname.startsWith("/api/og")) {
    response.headers.set(
      "Cache-Control",
      "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800"
    );
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
