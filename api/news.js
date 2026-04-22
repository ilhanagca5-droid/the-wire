// api/news.js — NewsAPI.org proxy
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');

  const API_KEY = process.env.NEWS_API_KEY || 'd714eda0c1d04f8fbf391beef36c81b5';
  const category = req.query.category || 'general';

  const categoryMap = {
    national:    'us+news+america',
    politics:    'us+politics+congress+white+house',
    economy:     'us+economy+federal+reserve+wall+street',
    foreign:     'us+foreign+policy+diplomacy+nato',
    tech:        'us+technology+silicon+valley+AI',
    defense:     'us+military+pentagon+defense',
  };

  const q = categoryMap[category] || 'united states';

  try {
    const url = `https://newsapi.org/v2/everything?q=${q}&language=en&sortBy=publishedAt&pageSize=6&apiKey=${API_KEY}`;
    const r = await fetch(url);
    const data = await r.json();

    if (data.status !== 'ok') {
      return res.status(500).json({ ok: false, error: data.message });
    }

    const articles = data.articles.map(a => ({
      title:       a.title?.replace(/ - .*$/, '') || 'No title',
      description: a.description || '',
      source:      a.source?.name || '',
      url:         a.url,
      publishedAt: a.publishedAt,
    }));

    return res.status(200).json({ ok: true, articles });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
