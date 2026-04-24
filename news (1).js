// api/news.js — NewsData.io, dedup + recency filter
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=60');

  const API_KEY = process.env.NEWSDATA_KEY || 'pub_4e0733e2c1554fa7857ceb310242dfc6';
  const cat = req.query.category || 'national';

  const categoryMap = {
    national: { category: 'top',        q: 'america' },
    politics: { category: 'politics',   q: 'congress OR "white house" OR senate' },
    economy:  { category: 'business',   q: 'economy OR "federal reserve" OR inflation OR "wall street"' },
    foreign:  { category: 'world',      q: '"united states" OR "US foreign" OR nato OR diplomacy' },
    tech:     { category: 'technology', q: 'technology OR AI OR silicon valley' },
    defense:  { category: 'top',        q: 'military OR pentagon OR defense OR army' },
  };

  const { category, q } = categoryMap[cat] || categoryMap.national;

  try {
    // Fetch two pages to get more articles
    const fetchPage = async (page) => {
      const url = `https://newsdata.io/api/1/news?apikey=${API_KEY}&country=us&language=en&category=${category}&q=${encodeURIComponent(q)}&size=10${page ? '&page='+page : ''}`;
      const r = await fetch(url);
      const d = await r.json();
      if (d.status !== 'success') throw new Error(d.message || 'API error');
      return d.results || [];
    };

    const [page1, page2] = await Promise.allSettled([fetchPage(null), fetchPage(2)]);
    
    const raw = [
      ...(page1.status === 'fulfilled' ? page1.value : []),
      ...(page2.status === 'fulfilled' ? page2.value : []),
    ];

    if (raw.length === 0) throw new Error('No articles returned');

    // Deduplicate by title similarity (first 60 chars)
    const seen = new Set();
    const seenUrls = new Set();
    
    const articles = raw
      .map(a => ({
        title:       (a.title || '').replace(/\s*-\s*[^-]+$/, '').trim(), // remove source suffix
        description: (a.description || a.content || '').slice(0, 220),
        source:      a.source_name || a.source_id || '',
        url:         a.link || '',
        image:       a.image_url || null,
        publishedAt: a.pubDate || new Date().toISOString(),
      }))
      .filter(a => {
        if (!a.title || a.title.length < 15) return false;
        if (!a.url) return false;
        if (seenUrls.has(a.url)) return false;
        const key = a.title.slice(0, 55).toLowerCase().replace(/\W+/g, '');
        if (seen.has(key)) return false;
        seen.add(key);
        seenUrls.add(a.url);
        return true;
      })
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
      .slice(0, 12);

    return res.status(200).json({ ok: true, articles });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
