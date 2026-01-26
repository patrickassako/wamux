import createMiddleware from 'next-intl/middleware';
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const intlMiddleware = createMiddleware({
    // A list of all locales that are supported
    locales: ['en', 'fr'],

    // Used when no locale matches
    defaultLocale: 'fr'
});

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();

    const path = request.nextUrl.pathname;
    // Check if the path is an auth route (login or register), allowing for optional locale prefix
    const isAuthRoute = /^\/(?:(?:en|fr)\/)?(login|register)$/.test(path);

    if (user && isAuthRoute) {
        // Redirect to dashboard, preserving locale if present or defaulting to 'fr'
        const localeMatch = path.match(/^\/(en|fr)/);
        const locale = localeMatch ? localeMatch[1] : 'fr';

        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = `/${locale}/dashboard`;
        return NextResponse.redirect(redirectUrl);
    }

    // Return the response from intlMiddleware
    // Note: We are not merging the cookies set by Supabase (if any) into the intlResponse here 
    // because intlMiddleware creates a new response. 
    // In a production app with strict token refresh needs, we might need to copy headers.
    return intlMiddleware(request);
}

export const config = {
    // Match all pathnames except for
    // - … if they start with `/api`, `/_next` or `/_vercel`
    // - … the ones containing a dot (e.g. `favicon.ico`)
    matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
