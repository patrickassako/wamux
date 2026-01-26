import { getRequestConfig } from 'next-intl/server';
import { headers } from 'next/headers';

export default getRequestConfig(async ({ requestLocale }) => {
    // This typically comes from the middleware, but we can verify it here
    let locale = await requestLocale;

    if (!locale) {
        locale = 'fr';
    }

    return {
        locale,
        messages: (await import(`../../messages/${locale}.json`)).default
    };
});
