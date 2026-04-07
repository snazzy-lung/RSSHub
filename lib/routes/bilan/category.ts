import { load } from 'cheerio';

import { type Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';

const CATEGORIES: Record<string, string> = {
    home: '',
    economie: '/economie',
    innovation: '/innovation',
    entreprises: '/entreprises',
    immobilier: '/immobilier',
    'luxe-lifestyle': '/luxe-lifestyle',
    finance: '/finance',
    monde: '/monde',
    dossiers: '/dossiers',
};

export const route: Route = {
    path: '/:category?',
    name: 'Bilan — Articles',
    url: 'https://www.bilan.ch',
    maintainers: ['corraya'],
    example: '/bilan/economie',
    parameters: {
        category: {
            description: "Catégorie (ex: economie, innovation, entreprises…). Laisser vide pour l'accueil.",
            options: Object.keys(CATEGORIES).map((k) => ({ value: k, label: k })),
            default: 'home',
        },
    },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: true,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        { source: ['bilan.ch/'], target: '/' },
        { source: ['bilan.ch/:category'], target: '/:category' },
    ],

    handler: async (ctx) => {
        const category = ctx.req.param('category') ?? 'home';
        const path = CATEGORIES[category] ?? '';
        const url = `https://www.bilan.ch${path}`;

        const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

        const cookie = await cache.tryGet(
            'bilan-cookie',
            async () => {
                const response = await ofetch.raw('https://www.bilan.ch/', {
                    headers: {
                        'User-Agent': ua,
                    },
                    redirect: 'manual',
                });
                const setCookie = response.headers.get('set-cookie');
                if (setCookie) {
                    return setCookie.split(';')[0];
                }
                return '';
            },
            3600
        );

        const html = await ofetch(url, {
            headers: {
                'Accept-Language': 'fr-CH,fr;q=0.9',
                'User-Agent': ua,
                cookie,
            },
        });

        const $ = load(html);
        const seenLinks = new Set();
        const items: any[] = [];

        // Les données sont dans des <script id="teaser-data-XXXX" type="application/json">
        $('script[id^="teaser-data-"]').each((_, el) => {
            try {
                const parsed = JSON.parse($(el).html() ?? '{}');
                const data = parsed.teaser || parsed;
                const itemPath = data.path || data.url;

                if (!itemPath || !data.title) {
                    return;
                }

                const articleUrl = itemPath.startsWith('http') ? itemPath : `https://www.bilan.ch${itemPath.startsWith('/') ? '' : '/'}${itemPath}`;

                if (seenLinks.has(articleUrl)) {
                    return;
                }
                seenLinks.add(articleUrl);

                let authorName = '';
                if (data.authors && data.authors.length > 0) {
                    authorName = data.authors.map((a: any) => a.name).join(', ');
                } else if (data.authors?.name) {
                    authorName = data.authors.name;
                }

                items.push({
                    title: data.titleHeader ? `${data.titleHeader} — ${data.title}` : data.title,
                    link: articleUrl,
                    description: data.lead ?? '',
                    pubDate: data.date ?? data.published,
                    author: authorName,
                    category: data.categoryPath ? [data.categoryPath] : [],
                    image: data.image?.url ?? '',
                    _extra: {
                        isPremium: data.isPremium ?? false,
                    },
                });
            } catch {
                // JSON invalide, on skip
            }
        });

        const label = category === 'home' ? 'Accueil' : category.charAt(0).toUpperCase() + category.slice(1);

        return {
            title: `Bilan — ${label}`,
            link: url,
            description: `Derniers articles Bilan.ch — ${label}`,
            language: 'fr',
            item: items,
        };
    },
};
