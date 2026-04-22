// api/news.js — NewsData.io proxy
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  res.setHeader('Cache-Control', 's-maxage=180, stale-while-revalidate=60');

  const API_KEY = process.env.NEWSDATA_KEY || 'pub_4e0733e2c1554fa7857ceb310242dfc6';
  const cat = req.query.category || 'national';

  const categoryMap = {
    national: { category: 'top',        q: 'united states' },
    politics: { category: 'politics',   q: 'us congress white house' },
    economy:  { category: 'business',   q: 'us economy federal reserve' },
    foreign:  { category: 'world',      q: 'us foreign policy' },
    tech:     { category: 'technology', q: 'united states' },
    defense:  { category: 'top',        q: 'us military pentagon defense' },
  };

  const { category, q } = categoryMap[cat] || categoryMap.national;

  try {
    const url = `https://newsdata.io/api/1/news?apikey=${API_KEY}&country=us&language=en&category=${category}&q=${encodeURIComponent(q)}&size=10`;
    const r = await fetch(url);
    const data = await r.json();

    if (data.status !== 'success') {
      throw new Error(data.message || 'API error');
    }

    const articles = (data.results || []).map(a => ({
      title:       a.title || '',
      description: a.description || a.content?.slice(0, 200) || '',
      source:      a.source_name || a.source_id || '',
      url:         a.link || '',
      image:       a.image_url || null,
      publishedAt: a.pubDate || new Date().toISOString(),
    })).filter(a => a.title.length > 10);

    return res.status(200).json({ ok: true, articles });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
