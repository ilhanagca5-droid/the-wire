// api/news.js
export const config = { runtime: 'nodejs' };

const FEEDS = {
  national: [
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/US.xml', name: 'New York Times' },
    { url: 'https://feeds.npr.org/1001/rss.xml', name: 'NPR' },
    { url: 'https://feeds.washingtonpost.com/rss/national', name: 'Washington Post' },
    { url: 'https://www.cbsnews.com/latest/rss/main', name: 'CBS News' },
    { url: 'https://abcnews.go.com/abcnews/usheadlines', name: 'ABC News' },
    { url: 'https://feeds.foxnews.com/foxnews/national', name: 'Fox News' },
    { url: 'https://feeds.nbcnews.com/nbcnews/public/news', name: 'NBC News' },
    { url: 'https://www.latimes.com/rss2.0.xml', name: 'LA Times' },
  ],
  politics: [
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml', name: 'New York Times' },
    { url: 'https://feeds.npr.org/1014/rss.xml', name: 'NPR' },
    { url: 'https://feeds.washingtonpost.com/rss/politics', name: 'Washington Post' },
    { url: 'https://thehill.com/rss/syndicator/19109', name: 'The Hill' },
    { url: 'https://feeds.politico.com/politico/politics', name: 'Politico' },
    { url: 'https://abcnews.go.com/abcnews/politicsheadlines', name: 'ABC News' },
    { url: 'https://feeds.foxnews.com/foxnews/politics', name: 'Fox News' },
    { url: 'https://feeds.nbcnews.com/nbcnews/public/politics', name: 'NBC News' },
  ],
  economy: [
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Economy.xml', name: 'New York Times' },
    { url: 'https://feeds.npr.org/1006/rss.xml', name: 'NPR' },
    { url: 'https://feeds.marketwatch.com/marketwatch/topstories/', name: 'MarketWatch' },
    { url: 'https://www.cnbc.com/id/10000664/device/rss/rss.html', name: 'CNBC' },
    { url: 'https://feeds.bloomberg.com/markets/news.rss', name: 'Bloomberg' },
    { url: 'https://feeds.foxbusiness.com/foxbusiness/latest', name: 'Fox Business' },
    { url: 'https://feeds.washingtonpost.com/rss/business', name: 'Washington Post' },
    { url: 'https://www.cnbc.com/id/15839069/device/rss/rss.html', name: 'CNBC Economy' },
  ],
  foreign: [
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', name: 'New York Times' },
    { url: 'https://feeds.npr.org/1004/rss.xml', name: 'NPR' },
    { url: 'https://feeds.washingtonpost.com/rss/world', name: 'Washington Post' },
    { url: 'https://www.cbsnews.com/latest/rss/world', name: 'CBS News' },
    { url: 'https://abcnews.go.com/abcnews/internationalheadlines', name: 'ABC News' },
    { url: 'https://feeds.reuters.com/reuters/worldNews', name: 'Reuters' },
    { url: 'https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml', name: 'BBC News' },
    { url: 'https://feeds.nbcnews.com/nbcnews/public/world', name: 'NBC News' },
  ],
  tech: [
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml', name: 'New York Times' },
    { url: 'https://feeds.arstechnica.com/arstechnica/index', name: 'Ars Technica' },
    { url: 'https://www.theverge.com/rss/index.xml', name: 'The Verge' },
    { url: 'https://feeds.wired.com/wired/index', name: 'Wired' },
    { url: 'https://www.cnbc.com/id/19854910/device/rss/rss.html', name: 'CNBC Tech' },
    { url: 'https://feeds.npr.org/1019/rss.xml', name: 'NPR' },
    { url: 'https://feeds.feedburner.com/TechCrunch', name: 'TechCrunch' },
    { url: 'https://feeds.washingtonpost.com/rss/business/technology', name: 'Washington Post' },
  ],
  defense: [
    { url: 'https://www.defensenews.com/arc/outboundfeeds/rss/', name: 'Defense News' },
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', name: 'New York Times' },
    { url: 'https://feeds.npr.org/1004/rss.xml', name: 'NPR' },
    { url: 'https://www.military.com/rss-feeds/content?category=news', name: 'Military.com' },
    { url: 'https://feeds.washingtonpost.com/rss/national-security', name: 'Washington Post' },
    { url: 'https://abcnews.go.com/abcnews/internationalheadlines', name: 'ABC News' },
    { url: 'https://feeds.foxnews.com/foxnews/national', name: 'Fox News' },
    { url: 'https://www.cbsnews.com/latest/rss/world', name: 'CBS News' },
  ],
};

function parseRSS(xml, sourceName) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];

    const get = (tag) => {
      const m = block.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i'));
      return m ? m[1].trim() : '';
    };

    const decodeHtml = (s) => s
      .replace(/&amp;/g,'&').replace(/&quot;/g,'"')
      .replace(/&#039;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');

    // Extract image
    const imgPatterns = [
      /url="([^"]+\.(?:jpg|jpeg|png|webp))(?:\?[^"]*)?"[^>]*(?:medium="image"|type="image")/i,
      /<media:content[^>]+url="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i,
      /<media:thumbnail[^>]+url="([^"]+)"/i,
      /<enclosure[^>]+url="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i,
      /url="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i,
      /<img[^>]+src="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i,
    ];

    let image = null;
    for (const pat of imgPatterns) {
      const m = block.match(pat);
      if (m?.[1] && !m[1].includes('pixel') && !m[1].includes('icon') && m[1].length > 20) {
        image = m[1]; break;
      }
    }

    const title = decodeHtml(get('title').replace(/<[^>]+>/g, '').replace(/\s*[-|]\s*[^-|]+$/, '')).trim();
    const desc  = decodeHtml(get('description').replace(/<[^>]+>/g, '')).slice(0, 250).trim();
    const link  = get('link') || get('guid');
    const pub   = get('pubDate');

    if (title.length > 15 && link) {
      items.push({
        title,
        description: desc,
        url: link,
        source: sourceName,
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
    feeds.map(async ({ url, name }) => {
      const r = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsAggregator/1.0)' },
        signal: AbortSignal.timeout(7000),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const xml = await r.text();
      return parseRSS(xml, name);
    })
  );

  const allArticles = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);

  if (allArticles.length === 0) {
    return res.status(500).json({ ok: false, error: 'All feeds failed' });
  }

  const seen = new Set();
  const unique = allArticles
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .filter(a => {
      const key = a.title.slice(0, 55).toLowerCase().replace(/\W+/g, '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 20);

  return res.status(200).json({ ok: true, articles: unique });
}
