import { load } from 'cheerio';

import { type Route } from '@/types';
import puppeteer from '@/utils/puppeteer';

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
        requirePuppeteer: true, // ← important
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

        const browser = await puppeteer();
        const page = await browser.newPage();

        await page.setExtraHTTPHeaders({
            'Accept-Language': 'fr-CH,fr;q=0.9',
        });

        try {
            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 30000,
            });

            // Attendre que les articles soient rendus
            await page.waitForSelector('article', { timeout: 15000 });

            const html = await page.content();
            const $ = load(html);

            const seenLinks = new Set<string>();
            const items: any[] = [];

            $('article').each((_, el) => {
                const anchor = $(el).find('a[href]').first();
                const rawHref = anchor.attr('href') ?? '';
                if (!rawHref) {
                    return;
                }

                const articleUrl = rawHref.startsWith('http') ? rawHref : `https://www.bilan.ch${rawHref}`;

                if (seenLinks.has(articleUrl)) {
                    return;
                }
                seenLinks.add(articleUrl);

                const title = $(el).find('h2, h3').first().text().trim();
                if (!title) {
                    return;
                }

                const description = $(el).find('p').first().text().trim();
                const pubDate = $(el).find('time').attr('datetime') ?? '';
                const author = $(el).find('[class*="author"], [class*="auteur"], [rel="author"]').first().text().trim();
                const image = $(el).find('img').first().attr('src') ?? $(el).find('img').first().attr('data-src') ?? '';

                items.push({
                    title,
                    link: articleUrl,
                    description,
                    pubDate,
                    author,
                    image,
                });
            });

            const label = category === 'home' ? 'Accueil' : category.charAt(0).toUpperCase() + category.slice(1);

            return {
                title: `Bilan — ${label}`,
                link: url,
                description: `Derniers articles Bilan.ch — ${label}`,
                language: 'fr',
                item: items,
            };
        } finally {
            browser.close();
        }
    },
};
