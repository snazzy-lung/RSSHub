import type { Route } from '@/types';
import ofetch from '@/utils/ofetch';

const BASE_URL = 'https://www.immobilier.ch';

export const route: Route = {
    path: '/actualite',
    name: 'Actualités immobilières',
    url: 'immobilier.ch',
    maintainers: ['corraya'],
    example: '/immobilier-ch/actualite',
    handler: async () => {
        const data = await ofetch(`${BASE_URL}/api/articles/search?count=20&lang=fr`, {
            method: 'POST',
            headers: {
                accept: 'application/json',
                origin: BASE_URL,
                referer: `${BASE_URL}/fr/actualite`,
                'user-agent': 'Mozilla/5.0 (compatible; RSSHub)',
            },
        });

        const articles = [...(data.articles ?? []), ...(data.advices ?? [])];

        const items = articles.map((article: any) => ({
            title: article.title ?? article.name,
            link: article.shareParameters?.item?.url ?? (article.url.startsWith('http') ? article.url : `${BASE_URL}${article.url}`),
            description: `
                ${article.image?.url ? `<img src="${article.image.url}" alt="${article.image.alt ?? ''}" /><br/>` : ''}
                ${article.description ?? ''}
                ${article.authorName ? `<br/><em>${article.authorName}</em>` : ''}
            `.trim(),
            category: article.sectionTitle,
            author: article.authorName,
            guid: String(article.id),
        }));

        return {
            title: 'immobilier.ch — Actualités',
            link: `${BASE_URL}/fr/actualite`,
            item: items,
        };
    },
};
