// api/news.js — RSS aggregator, no API key, no limits
export const config = { runtime: 'nodejs' };

const FEEDS = {
  national: [
    'https://feeds.npr.org/1001/rss.xml',
    'https://rss.nytimes.com/services/xml/rss/nyt/US.xml',
    'https://feeds.washingtonpost.com/rss/national',
    'https://www.cbsnews.com/latest/rss/main',
  ],
  politics: [
    'https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml',
    'https://feeds.npr.org/1014/rss.xml',
    'https://feeds.washingtonpost.com/rss/politics',
    'https://thehill.com/rss/syndicator/19109',
  ],
  economy: [
    'https://feeds.npr.org/1006/rss.xml',
    'https://rss.nytimes.com/services/xml/rss/nyt/Economy.xml',
    'https://feeds.marketwatch.com/marketwatch/topstories/',
    'https://www.cnbc.com/id/10000664/device/rss/rss.html',
  ],
  foreign: [
    'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
    'https://feeds.npr.org/1004/rss.xml',
    'https://feeds.washingtonpost.com/rss/world',
    'https://www.cbsnews.com/latest/rss/world',
  ],
  tech: [
    'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml',
    'https://feeds.npr.org/1019/rss.xml',
    'https://feeds.arstechnica.com/arstechnica/index',
    'https://www.theverge.com/rss/index.xml',
  ],
  defense: [
    'https://www.defensenews.com/arc/outboundfeeds/rss/',
    'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
    'https://feeds.npr.org/1004/rss.xml',
    'https://www.military.com/rss-feeds/content?category=news',
  ],
};

const SOURCE_NAMES = {
  'npr.org':           'NPR',
  'nytimes.com':       'New York Times',
  'washingtonpost.com':'Washington Post',
  'cbsnews.com':       'CBS News',
  'thehill.com':       'The Hill',
  'marketwatch.com':   'MarketWatch',
  'cnbc.com':          'CNBC',
  'arstechnica.com':   'Ars Technica',
  'theverge.com':      'The Verge',
  'defensenews.com':   'Defense News',
  'military.com':      'Military.com',
};

function getSourceName(url) {
  try {
    const host = new URL(url).hostname.replace('www.','').replace('feeds.','');
    for (const [key, name] of Object.entries(SOURCE_NAMES)) {
      if (host.includes(key)) return name;
    }
    return host;
  } catch { return ''; }
}

function parseRSS(xml, feedUrl) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];

    const get = (tag) => {
      const m = block.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i'));
      return m ? m[1].trim() : '';
    };

    // Extract image from multiple possible locations
    const imgPatterns = [
      /url="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i,
      /<media:content[^>]+url="([^"]+)"/i,
      /<media:thumbnail[^>]+url="([^"]+)"/i,
      /<enclosure[^>]+url="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i,
      /<img[^>]+src="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i,
    ];
    let image = null;
    for (const pat of imgPatterns) {
      const m = block.match(pat);
      if (m && m[1] && !m[1].includes('pixel') && m[1].length > 10) {
        image = m[1]; break;
      }
    }

    const title = get('title').replace(/<[^>]+>/g, '').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#039;/g,"'").trim();
    const desc  = get('description').replace(/<[^>]+>/g, '').replace(/&amp;/g,'&').replace(/&quot;/g,'"').slice(0, 240).trim();
    const link  = get('link') || get('guid');
    const pub   = get('pubDate');

    if (title.length > 15 && link) {
      items.push({
        title,
        description: desc,
        url: link,
        source: getSourceName(feedUrl),
        image,
        publishedAt: pub ? new Date(pub).toISOString() : new Date().toISOString(),
      });
    }
  }
  return items;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  res.setHeader('Cache-Control', 's-maxage=180, stale-while-revalidate=90');

  const cat = req.query.category || 'national';
  const feeds = FEEDS[cat] || FEEDS.national;

  const results = await Promise.allSettled(
    feeds.map(async (feedUrl) => {
      const r = await fetch(feedUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TheWire/2.0; +https://thewire.vercel.app)' },
        signal: AbortSignal.timeout(6000),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const xml = await r.text();
      return parseRSS(xml, feedUrl);
    })
  );

  const allArticles = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);

  if (allArticles.length === 0) {
    return res.status(500).json({ ok: false, error: 'All RSS feeds failed' });
  }

  // Deduplicate by title fingerprint
  const seen = new Set();
  const unique = allArticles
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .filter(a => {
      const key = a.title.slice(0, 50).toLowerCase().replace(/\W+/g, '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12);

  return res.status(200).json({ ok: true, articles: unique });
}
