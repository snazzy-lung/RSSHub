import { load } from 'cheerio';

import type { Route } from '@/types';
import ofetch from '@/utils/ofetch';

const BASE_URL = 'https://www.rts.ch';

const SECTIONS: Record<string, string> = {
    'sciences-tech': 'Sciences & Tech',
    'economie-et-finance': 'Économie & Finance',
    suisse: 'Suisse',
    monde: 'Monde',
    culture: 'Culture',
};

export const route: Route = {
    path: '/:section?',
    name: 'RTS Info — Section',
    url: 'rts.ch',
    maintainers: ['corraya'],
    example: '/rts/sciences-tech',
    parameters: {
        section: {
            description: `Section RTS Info. Valeurs possibles : ${Object.keys(SECTIONS).join(', ')}`,
            default: 'sciences-tech',
        },
    },
    handler: async (ctx) => {
        const section = ctx.req.param('section') ?? 'sciences-tech';
        const url = `${BASE_URL}/info/${section}`;

        const html = await ofetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; RSSHub)',
            },
        });

        const $ = load(html);

        const items = $('a.card-caption[href]')
            .toArray()
            .map((el) => {
                const $el = $(el);
                const link = $el.attr('href') ?? '';
                const fullLink = link.startsWith('http') ? link : `${BASE_URL}${link}`;
                const title = $el.find('p.card-title').text().trim();
                const category = $el.find('p.card-bait').text().trim();
                const date = $el.find('p.card-time').text().trim();
                const image = $el.find('img.embed-responsive-item').attr('src') ?? '';

                if (!title || !fullLink) {
                    return null;
                }

                return {
                    title,
                    link: fullLink,
                    category,
                    pubDate: date,
                    description: image ? `<img src="${image}" /><br/>${title}` : title,
                };
            })
            .filter(Boolean);

        return {
            title: `RTS Info — ${SECTIONS[section] ?? section}`,
            link: url,
            item: items,
        };
    },
};
