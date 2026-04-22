// api/news.js — GNews.io proxy (real-time, free tier)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=60');

  const API_KEY = 'e9e0822af5298a7dbb8c74d4f81037ce';

  const categoryMap = {
    national: 'top headlines united states',
    politics: 'us politics congress white house',
    economy:  'us economy federal reserve inflation',
    foreign:  'us foreign policy diplomacy nato',
    tech:     'us technology artificial intelligence silicon valley',
    defense:  'us military pentagon defense',
  };

  const cat = req.query.category || 'national';
  const q   = encodeURIComponent(categoryMap[cat] || 'united states');

  try {
    const url = `https://gnews.io/api/v4/search?q=${q}&lang=en&country=us&max=10&apikey=${API_KEY}`;
    const r    = await fetch(url);
    const data = await r.json();

    if (data.errors) throw new Error(data.errors.join(', '));

    const articles = (data.articles || []).map(a => ({
      title:       a.title  || '',
      description: a.description || '',
      source:      a.source?.name || '',
      url:         a.url,
      image:       a.image || null,
      publishedAt: a.publishedAt,
    }));

    return res.status(200).json({ ok: true, articles });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
