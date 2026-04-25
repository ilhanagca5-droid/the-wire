// api/markets.js
const SYMBOLS = {
  indices:     ['%5EGSPC','%5EDJI','%5EIXIC'],
  names_i:     ['S&P 500','Dow Jones','Nasdaq'],
  commodities: ['GC%3DF','SI%3DF','CL%3DF'],
  names_c:     ['Gold / oz','Silver / oz','WTI Crude'],
  fx:          ['EURUSD%3DX','GBPUSD%3DX','JPY%3DX','TRY%3DX'],
  names_f:     ['EUR/USD','GBP/USD','USD/JPY','USD/TRY'],
};

async function q(symbol) {
  const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`,
    { headers:{ 'User-Agent':'Mozilla/5.0' } });
  const d = await r.json();
  const m = d?.chart?.result?.[0]?.meta;
  if (!m) throw new Error('no data');
  const price = m.regularMarketPrice;
  const prev  = m.chartPreviousClose ?? price;
  return { price, change: price-prev, pct: ((price-prev)/prev)*100 };
}

async function group(symbols, names) {
  return Promise.all(symbols.map(async (s,i) => {
    try { return { name: names[i], ...(await q(s)), ok:true }; }
    catch { return { name: names[i], price:null, change:null, pct:null, ok:false }; }
  }));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Cache-Control','s-maxage=60,stale-while-revalidate=30');
  try {
    const [indices, commodities, fx] = await Promise.all([
      group(SYMBOLS.indices, SYMBOLS.names_i),
      group(SYMBOLS.commodities, SYMBOLS.names_c),
      group(SYMBOLS.fx, SYMBOLS.names_f),
    ]);
    res.status(200).json({ ok:true, indices, commodities, fx });
  } catch(e) {
    res.status(500).json({ ok:false, error:e.message });
  }
}
