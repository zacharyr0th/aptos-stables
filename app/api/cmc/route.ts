// app/api/cmc/route.ts
import { NextResponse } from 'next/server';

// Revalidate this route every 5 minutes
export const revalidate = 300;

const CACHE_DURATION = 300;          // 5 minutes in seconds
const STALE_WHILE_REVALIDATE = 60;   // 1 minute in seconds
const MIN_REQUEST_INTERVAL = 2000;   // 2 seconds in milliseconds
const FETCH_TIMEOUT = 5000;          // 5 seconds in milliseconds

let lastRequestTime = 0;
let cachedResponse: NextResponse | null = null;
let cachedTimestamp = 0;

export async function GET(request: Request) {
  // --- Determine User-Agent safely from the Request object ---
  const userAgent =
    request.headers.get('user-agent')?.slice(0, 50) ??
    'unknown';

  // --- Ensure API key is available ---
  const apiKey = process.env.CMC_API_KEY;
  if (!apiKey) {
    console.error('CMC_API_KEY not found in environment variables');
    return NextResponse.json(
      { error: 'CMC API key is required but not configured. Please add your CMC_API_KEY to the .env file.' },
      { status: 500 }
    );
  }

  const now = Date.now();

  // --- Serve from cache if still fresh unless explicitly skipping cache ---
  const skipCache = request.headers.get('cache-control')?.includes('no-cache');
  
  if (!skipCache && cachedResponse && now - cachedTimestamp < CACHE_DURATION * 1000) {
    console.log('Serving cached CMC response');
    return cachedResponse;
  }

  // --- Enforce a global minimum delay between upstream calls ---
  if (now - lastRequestTime < MIN_REQUEST_INTERVAL) {
    console.log('Rate limit hit, attempting to serve stale cache');
    if (cachedResponse) {
      return cachedResponse;
    }
    return NextResponse.json(
      { error: 'Too many requests', message: 'Please try again in a few seconds' },
      {
        status: 429,
        headers: { 'Retry-After': '2' }
      }
    );
  }
  lastRequestTime = now;

  // --- Fetch from CoinMarketCap ---
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    console.log(
      `Fetching data from CoinMarketCap API (User-Agent: ${userAgent})`
    );

    const res = await fetch(
      'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?id=29471',
      {
        headers: {
          'X-CMC_PRO_API_KEY': apiKey,
          Accept: 'application/json',
        },
        signal: controller.signal,
        next: { revalidate },
      }
    );

    clearTimeout(timeoutId);

    // --- Handle non-2xx responses ---
    if (!res.ok) {
      const body = await res.text();
      console.error(`CMC API error ${res.status}:`, body);

      if (res.status === 429 && cachedResponse) {
        console.log('Upstream rate limited, serving stale cache');
        return cachedResponse;
      }

      if (res.status === 429) {
        return NextResponse.json(
          { error: 'Rate limit exceeded', message: 'Too many requests to price API' },
          {
            status: 429,
            headers: { 'Retry-After': '60' },
          }
        );
      }

      if (cachedResponse) {
        console.log(`CMC API error ${res.status}, serving stale cache`);
        return cachedResponse;
      }

      return NextResponse.json(
        { error: `API responded with status: ${res.status}` },
        { status: res.status }
      );
    }

    // --- Parse and validate response ---
    const json = await res.json();
    const price = json?.data?.['29471']?.quote?.USD?.price;

    if (price == null) {
      console.error('Invalid price data structure:', json);
      if (cachedResponse) {
        console.log('Invalid data, serving stale cache');
        return cachedResponse;
      }
      return NextResponse.json(
        { error: 'Invalid price data received' },
        { status: 502 }
      );
    }

    // --- Build and cache the new response ---
    const payload = {
      symbol: 'sUSDe',
      name: 'Ethena Staked USDe',
      price,
      updated: new Date().toISOString(),
    };

    const freshResponse = NextResponse.json(payload, {
      headers: {
        'Cache-Control': `public, max-age=${CACHE_DURATION}, s-maxage=${CACHE_DURATION}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`,
        'Content-Type': 'application/json',
      },
    });

    cachedResponse = freshResponse;
    cachedTimestamp = now;

    return freshResponse;
  } catch (error: unknown) {
    console.error('CMC API fetch error:', error instanceof Error ? error.message : String(error));

    if (cachedResponse) {
      console.log('Fetch error, serving stale cache');
      return cachedResponse;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      console.error('CMC API request timed out');
      return NextResponse.json(
        { error: 'Request timeout', message: 'API request timed out' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
