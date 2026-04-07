import { load } from 'cheerio';

import { type Route } from '@/types';
import ofetch from '@/utils/ofetch';

import { namespace } from './namespace';

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
            description: "Catégorie (ex: economie, innovation, entreprises, immobilier…). Laisser vide pour la page d'accueil.",
            options: Object.keys(CATEGORIES).map((k) => ({ value: k, label: k })),
            default: 'home',
        },
    },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        { source: ['bilan.ch/'], target: '/' },
        { source: ['bilan.ch/:category'], target: '/:category' },
    ],
    namespace,

    handler: async (ctx) => {
        const category = ctx.req.param('category') ?? 'home';
        const path = CATEGORIES[category] ?? '';
        const url = `https://www.bilan.ch${path}`;

        const html = await ofetch(url, {
            headers: {
                'Accept-Language': 'fr-CH,fr;q=0.9',
                'User-Agent': 'Mozilla/5.0 (compatible; RSSHub)',
            },
        });

        const $ = load(html);
        const seenLinks = new Set();
        const items: any[] = [];

        // Les données sont dans des <script id="teaser-data-XXXX" type="application/json">
        $('script[id^="teaser-data-"]').each((_, el) => {
            try {
                const data = JSON.parse($(el).html() ?? '{}');

                if (!data.url || !data.title) {
                    return;
                }

                const articleUrl = data.url.startsWith('http') ? data.url : `https://www.bilan.ch${data.url.startsWith('/') ? '' : '/'}${data.url}`;

                if (seenLinks.has(articleUrl)) {
                    return;
                }
                seenLinks.add(articleUrl);

                items.push({
                    title: data.titleHeader ? `${data.titleHeader} — ${data.title}` : data.title,
                    link: articleUrl,
                    description: data.lead ?? '',
                    pubDate: data.date ?? data.published,
                    author: data.authors?.name ?? '',
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
