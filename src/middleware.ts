import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/register', '/api/v1/auth'];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // Check for auth token in cookie
  const token = request.cookies.get('token');

  // If user is logged in and tries to access login/register, redirect to dashboard
  if (token && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Handle root-level image/asset requests - check if user has an active proxy session
  // Look for common image/asset file extensions at root level
  const isRootAsset = /^\/([^/]+\.(png|jpg|jpeg|gif|svg|ico|webp|css|js|woff|woff2|ttf|eot|otf|mp4|mp3|pdf|map))(\?.*)?$/i.test(pathname);
  
  if (isRootAsset && token) {
    // First check for active proxy cookie (set when visiting proxy page)
    const activeProxyEndpoint = request.cookies.get('active-proxy-endpoint');
    if (activeProxyEndpoint?.value) {
      // Redirect to proxy path
      const assetPath = pathname + (request.nextUrl.search || '');
      return NextResponse.redirect(new URL(`/proxy/${activeProxyEndpoint.value}${assetPath}`, request.url));
    }
    
    // Fallback: Check if there's a referer header pointing to a proxy URL
    const referer = request.headers.get('referer');
    if (referer) {
      try {
        const refererUrl = new URL(referer);
        const refererPath = refererUrl.pathname;
        // Extract endpointId from referer if it's a proxy URL
        const proxyMatch = refererPath.match(/^\/proxy\/([^/]+)/);
        if (proxyMatch) {
          const endpointId = proxyMatch[1];
          // Redirect to proxy path
          const assetPath = pathname + (request.nextUrl.search || '');
          return NextResponse.redirect(new URL(`/proxy/${endpointId}${assetPath}`, request.url));
        }
      } catch (e) {
        // Invalid referer URL, continue normally
      }
    }
  }

  // If no token and trying to access protected route, redirect to login
  if (!token && !isPublicRoute) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

