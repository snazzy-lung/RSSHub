import { load } from 'cheerio';

import { type Route } from '@/types';
import ofetch from '@/utils/ofetch';

import { namespace } from './namespace';

export const route: Route = {
    path: '/:category?',
    categories: ['finance'],
    example: '/agefi/entreprises',
    parameters: {
        category: {
            description: "Catégorie d'actualités",
            options: [
                { value: 'entreprises', label: 'Entreprises' },
                { value: 'marches', label: 'Marchés' },
                { value: 'politique', label: 'Politique' },
                { value: 'macroeconomie', label: 'Macroéconomie' },
                { value: 'editorial', label: 'Éditorial' },
                { value: 'opinions', label: 'Opinions' },
                { value: 'trajectoires', label: 'Trajectoires' },
                { value: 'life', label: 'Life' },
                { value: 'immo', label: 'Immo' },
            ],
            default: 'entreprises',
        },
    },
    name: 'Actualités',
    maintainers: ['corraya'],
    url: 'agefi.com',
    handler: async (ctx) => {
        const category = ctx.req.param('category') ?? 'entreprises';
        const url = `https://agefi.com/actualites/${category}`;

        const response = await ofetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; RSSHub)',
            },
        });
        const $ = load(response);

        const items: any[] = [];
        $('article').each((_, el) => {
            const $el = $(el);
            const $link = $el.closest('[href]').first();
            const href = $link.attr('href') || $el.find('a').first().attr('href');
            const title = $el.find('h2 span').text().trim() || $el.find('h2').text().trim();
            const description = $el.find('p').text().trim();
            const dateText = $el.find('time').attr('dateTime') || $el.find('time').text().trim();

            if (title && href) {
                items.push({
                    title,
                    description,
                    link: href.startsWith('http') ? href : `https://agefi.com${href}`,
                    pubDate: dateText,
                });
            }
        });

        const categoryLabels: Record<string, string> = {
            entreprises: 'Entreprises',
            marches: 'Marchés',
            politique: 'Politique',
            macroeconomie: 'Macroéconomie',
            editorial: 'Éditorial',
            opinions: 'Opinions',
            trajectoires: 'Trajectoires',
            life: 'Life',
            immo: 'Immo',
        };

        return {
            title: `Agefi — ${categoryLabels[category] ?? category}`,
            link: url,
            item: items,
        };
    },
    namespace,
};
