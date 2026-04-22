// api/markets.js — Vercel Serverless Function
// Yahoo Finance'a server-side'dan istek atar (CORS sorunu olmaz)

const SYMBOLS = {
  indices: [
    { name: 'S&P 500',   symbol: '%5EGSPC' },
    { name: 'Dow Jones', symbol: '%5EDJI'  },
    { name: 'Nasdaq',    symbol: '%5EIXIC' },
  ],
  commodities: [
    { name: 'Gold / oz',   symbol: 'GC%3DF' },
    { name: 'Silver / oz', symbol: 'SI%3DF' },
    { name: 'WTI Crude',   symbol: 'CL%3DF' },
  ],
  fx: [
    { name: 'EUR/USD', symbol: 'EURUSD%3DX' },
    { name: 'GBP/USD', symbol: 'GBPUSD%3DX' },
    { name: 'USD/JPY', symbol: 'JPY%3DX'    },
    { name: 'USD/TRY', symbol: 'TRY%3DX'    },
  ]
};

async function fetchQuote(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'application/json',
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const meta = data?.chart?.result?.[0]?.meta;
  if (!meta) throw new Error('No meta');
  const price  = meta.regularMarketPrice;
  const prev   = meta.chartPreviousClose ?? meta.previousClose ?? price;
  const change = price - prev;
  const pct    = (change / prev) * 100;
  return { price, change, pct };
}

async function fetchGroup(group) {
  return Promise.all(
    group.map(async (item) => {
      try {
        const q = await fetchQuote(item.symbol);
        return { name: item.name, ...q, ok: true };
      } catch {
        return { name: item.name, price: null, change: null, pct: null, ok: false };
      }
    })
  );
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Cache 60s on Vercel edge
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');

  try {
    const [indices, commodities, fx] = await Promise.all([
      fetchGroup(SYMBOLS.indices),
      fetchGroup(SYMBOLS.commodities),
      fetchGroup(SYMBOLS.fx),
    ]);

    return res.status(200).json({
      ok: true,
      timestamp: new Date().toISOString(),
      indices,
      commodities,
      fx,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
