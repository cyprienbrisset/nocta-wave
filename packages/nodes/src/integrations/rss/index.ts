import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const RssSchema = z.object({
  feedUrl: z.string().url(),
  maxItems: z.number().default(10),
});

export const rssNode: NodeDefinition = createNode(
  {
    type: 'integration.rss',
    category: 'integration',
    name: 'RSS Feed',
    description: 'Read and parse RSS/Atom feeds',
    icon: 'Rss',
    inputs: [
      input.string('feedUrl', 'Feed URL', { required: true, placeholder: 'https://example.com/feed.xml' }),
      input.number('maxItems', 'Max Items', { default: 10 }),
    ],
    outputs: [output.main({ description: 'RSS feed data' })],
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = RssSchema.parse(nodeInput.config);

    logger.info(`RSS: Fetching ${config.feedUrl}`);

    const response = await fetch(config.feedUrl);
    const xml = await response.text();

    // Simple XML parsing (in production, use a proper parser like fast-xml-parser)
    const items: Array<{ title: string; link: string; description: string; pubDate: string }> = [];
    const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

    for (const item of itemMatches.slice(0, config.maxItems)) {
      const title = item.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/)?.[1] || '';
      const link = item.match(/<link>(.*?)<\/link>/)?.[1] || '';
      const description = item.match(/<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/)?.[1] || '';
      const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';
      items.push({ title, link, description, pubDate });
    }

    const feedTitle = xml.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/)?.[1] || '';

    return {
      data: {
        items,
        feed: { title: feedTitle, url: config.feedUrl, itemCount: items.length },
      },
    };
  }
);
