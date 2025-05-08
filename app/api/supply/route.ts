// Next.js 13+ "app router" style

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { z } from 'zod';

/** 1) Indexer GraphQL endpoint (public, no key required) */
const INDEXER = 'https://indexer.mainnet.aptoslabs.com/v1/graphql';

/** 2) Asset‑type strings straight from the projects' docs / explorers */
const TOKENS: Record<string, string> = {
  // Using the short form addresses (without the module::struct part)
  USDt:  '0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b',  // Tether
  USDC:  '0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b',  // Circle
  USDe:  '0xf37a8864fe737eb8ec2c2931047047cbaed1beed3fb0e5b7c5526dafd3b9c2e9',  // Ethena' USDe
  sUSDe: '0xb30a694a344edee467d9f82330bbe7c3b89f440a1ecd2da1f3bca266560fce69',  // Staked USDe
};

const GQL = `
  query Supply($types: [String!]) {
    fungible_asset_metadata(where: {asset_type: {_in: $types}}) {
      asset_type
      supply_v2
    }
  }
`;

// Cache configuration with LRU functionality
class LRUCache {
  private map = new Map<string, { value: bigint; timestamp: number; lastAccessed: number }>();
  private readonly maxSize: number;
  private readonly ttl: number;

  constructor(maxSize: number, ttl: number) {
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(key: string): { value: bigint; timestamp: number; isNearingExpiration: boolean } | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    
    const now = Date.now();
    // Check if entry has expired
    if (now - entry.timestamp >= this.ttl) {
      this.map.delete(key);
      return undefined;
    }
    
    // Update last accessed time
    entry.lastAccessed = now;
    this.map.set(key, entry);
    
    // Check if entry is nearing expiration (80% of TTL reached)
    const isNearingExpiration = now - entry.timestamp >= this.ttl * 0.8;
    
    return { value: entry.value, timestamp: entry.timestamp, isNearingExpiration };
  }

  set(key: string, value: bigint): void {
    const now = Date.now();
    
    // If at capacity and adding new key, remove LRU item
    if (this.map.size >= this.maxSize && !this.map.has(key)) {
      this.evictLRU();
    }
    
    this.map.set(key, { value, timestamp: now, lastAccessed: now });
  }

  private evictLRU(): void {
    if (this.map.size === 0) return;
    
    let lruKey: string | null = null;
    let lruTime = Date.now();
    
    for (const [key, entry] of this.map.entries()) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }
    
    if (lruKey) {
      this.map.delete(lruKey);
    }
  }

  has(key: string): boolean {
    return this.map.has(key);
  }

  entries(): [string, { value: bigint; timestamp: number }][] {
    return Array.from(this.map.entries()).map(([key, entry]) => [
      key, 
      { value: entry.value, timestamp: entry.timestamp }
    ]);
  }

  keys(): IterableIterator<string> {
    return this.map.keys();
  }

  get size(): number {
    return this.map.size;
  }

  cleanExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.map.entries()) {
      if (now - entry.timestamp >= this.ttl) {
        this.map.delete(key);
      }
    }
  }
}

// Cache and TTL configuration
const CACHE_TTL = 3600000; // 1 hour (increased from 60 seconds)
const MAX_CACHE_SIZE = 100; // Maximum number of entries to prevent unbounded growth
const cache = new LRUCache(MAX_CACHE_SIZE, CACHE_TTL);

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60000; // 1 minute window
const RATE_LIMIT_MAX_REQUESTS = 15; // 15 requests per minute (reduced from 30)
const BURST_LIMIT = 5; // Maximum requests in a 10-second period
const BURST_WINDOW = 10000; // 10 seconds
const ipRequests = new Map<string, { 
  count: number; 
  resetTime: number;
  requestTimestamps: number[]; // Array of timestamps for sliding window
}>();

// Add retry configuration below the rate limit configuration
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000; // 1 second

// Zod schemas for validation
const AssetMetadataSchema = z.object({
  asset_type: z.string(),
  supply_v2: z.union([z.string(), z.number()])
});

const GraphQLResponseSchema = z.object({
  data: z.object({
    fungible_asset_metadata: z.array(AssetMetadataSchema)
  }),
  errors: z.array(z.object({ message: z.string() })).optional()
});

// Get client IP address from request
async function getClientIp(): Promise<string> {
  const headersList = await headers();
  
  // Try different headers for IP, depending on your deployment setup
  const forwardedFor = headersList.get('x-forwarded-for') || '';
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIp = headersList.get('x-real-ip') || '';
  return realIp ? realIp : 'unknown-ip';
}

// Check rate limit for a given IP
function checkRateLimit(ip: string): { allowed: boolean; resetInSeconds?: number } {
  const now = Date.now();
  const record = ipRequests.get(ip);
  
  // If no record exists or window has expired, create new record
  if (!record || now >= record.resetTime) {
    ipRequests.set(ip, { 
      count: 1, 
      resetTime: now + RATE_LIMIT_WINDOW,
      requestTimestamps: [now]
    });
    return { allowed: true };
  }
  
  // Clean up old timestamps outside of burst window
  record.requestTimestamps = record.requestTimestamps.filter(
    timestamp => (now - timestamp) < BURST_WINDOW
  );
  
  // Add current timestamp
  record.requestTimestamps.push(now);
  
  // Check for burst limit (too many requests in a short period)
  if (record.requestTimestamps.length > BURST_LIMIT) {
    const resetInSeconds = Math.ceil(BURST_WINDOW / 1000);
    return { allowed: false, resetInSeconds };
  }
  
  // Increment request count for the longer window
  record.count++;
  
  // Check if over limit for the main window
  if (record.count > RATE_LIMIT_MAX_REQUESTS) {
    const resetInSeconds = Math.ceil((record.resetTime - now) / 1000);
    return { allowed: false, resetInSeconds };
  }
  
  return { allowed: true };
}

// Clean up expired rate limit entries and stale cache entries periodically
// Use self-invocation rather than setInterval to ensure cleanup 
// continues even if errors occur in a cleanup cycle
function scheduleCleanup() {
  setTimeout(() => {
    try {
      const now = Date.now();
      
      // Clean up rate limit entries more aggressively
      for (const [ip, data] of ipRequests.entries()) {
        // Remove if reset time has passed
        if (now >= data.resetTime) {
          ipRequests.delete(ip);
          continue;
        }
        
        // Clean expired timestamps from sliding window
        data.requestTimestamps = data.requestTimestamps.filter(
          timestamp => (now - timestamp) < BURST_WINDOW
        );
        
        // If client hasn't made requests recently (30s of inactivity), reduce count
        const mostRecentRequest = Math.max(...data.requestTimestamps, 0);
        if (now - mostRecentRequest > 30000 && data.count > 0) {
          // Gradually reduce count to allow recovery without full reset
          data.count = Math.max(0, data.count - 3);
        }
      }
      
      // Clean up stale cache entries
      cache.cleanExpired();
      
    } catch (error) {
      // Minimal generic error message
      console.error('Cleanup error occurred:', error);
    } finally {
      // Always reschedule regardless of success/failure
      scheduleCleanup();
    }
  }, 30000); // Run cleanup every 30 seconds (reduced from 60 seconds)
}

// Start the cleanup process
scheduleCleanup();

// Retry helper function
async function fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES, delay = RETRY_DELAY): Promise<Response> {
  try {
    const response = await fetch(url, options);
    
    // Don't retry for certain status codes
    if (response.status === 429 || response.status >= 400 && response.status < 500) {
      return response;
    }
    
    if (!response.ok && retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 1.5); // Exponential backoff
    }
    
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error; // Don't retry timeouts
    }
    
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 1.5); // Exponential backoff
    }
    
    throw error;
  }
}

/** Fetch all supplies in a single GraphQL query */
async function fetchAllSupplies(): Promise<Record<string, bigint>> {
  const tokenTypes = Object.values(TOKENS);
  const expiredTypes = tokenTypes.filter(type => !cache.has(type));
  const nearingExpirationTypes = tokenTypes.filter(type => {
    const entry = cache.get(type);
    return entry?.isNearingExpiration === true;
  });
  
  // Combine tokens that need refreshing (either expired or nearing expiration)
  const typesToFetch = [...new Set([...expiredTypes, ...nearingExpirationTypes])];
  
  if (typesToFetch.length === 0) {
    // Return all from cache
    return Object.fromEntries(
      tokenTypes.map(type => {
        const entry = cache.get(type);
        return [type, entry!.value];
      })
    );
  }
  
  try {
    // Set up AbortController with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const fetchOptions = {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: GQL, variables: { types: typesToFetch } }),
      cache: 'no-store' as RequestCache,
      signal: controller.signal,
    };
    
    const r = await fetchWithRetry(INDEXER, fetchOptions);
    
    // Clear timeout after response received
    clearTimeout(timeoutId);

    // Check for rate limiting
    if (r.status === 429) {
      console.warn('Rate limit reached, using cache');
      // Fall back to cached values, even if expired
      return Object.fromEntries(
        tokenTypes.map(type => {
          const cached = cache.get(type);
          if (cached) return [type, cached.value];
          throw new Error(`No cached data available during rate limiting`);
        })
      );
    }

    if (!r.ok) throw new Error(`API request failed with status ${r.status}`);

    const responseData = await r.json();
    
    // Validate response structure
    const validatedResponse = GraphQLResponseSchema.safeParse(responseData);
    
    if (!validatedResponse.success) {
      console.warn('Response validation failed');
      // Fall back to cached values
      return fallbackToCachedValues(tokenTypes);
    }
    
    const { data, errors } = validatedResponse.data;
    
    if (errors && errors.length > 0) {
      console.warn('Received GraphQL errors');
      // Fall back to cached values
      return fallbackToCachedValues(tokenTypes);
    }

    // Update cache with new values
    const updatedTypes = new Set<string>();
    data.fungible_asset_metadata.forEach((item) => {
      if (item.asset_type && item.supply_v2) {
        updatedTypes.add(item.asset_type);
        cache.set(item.asset_type, BigInt(item.supply_v2));
      }
    });
    
    // Check for missing types in the response without logging specific tokens
    const missingCount = typesToFetch.filter(type => !updatedTypes.has(type)).length;
    if (missingCount > 0) {
      console.warn(`Missing data for ${missingCount} tokens`);
    }
    
    // Return combined data (newly fetched + cached)
    return Object.fromEntries(
      tokenTypes.map(type => {
        const cached = cache.get(type);
        if (!cached) {
          throw new Error(`Supply data unavailable`);
        }
        return [type, cached.value];
      })
    );
  } catch (error) {
    console.warn('Failed to fetch all supplies');
    console.error('Fetch all supplies error details:', error);
    // Try to return as much cached data as possible
    return fallbackToCachedValues(tokenTypes);
  }
}

// Helper function to return cached values in error scenarios
function fallbackToCachedValues(tokenTypes: string[]): Record<string, bigint> {
  const result: Record<string, bigint> = {};
  let missingCount = 0;
  
  tokenTypes.forEach(type => {
    const cached = cache.get(type);
    if (cached) {
      result[type] = cached.value;
    } else {
      missingCount++;
    }
  });
  
  if (missingCount > 0) {
    console.warn(`Missing cached data for ${missingCount} tokens`);
    throw new Error(`Missing data for some tokens`);
  }
  
  return result;
}

// Use simpler ETag generation without conditional responses
function generateETag(data: Record<string, unknown>): string {
  // Simple hash function for generating ETag
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `"${hash.toString(16)}"`;
}

/** 4) API route */
export async function GET() {
  try {
    // Apply rate limiting
    const clientIp = await getClientIp();
    const rateLimitResult = checkRateLimit(clientIp);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded', 
          message: `Woah! Please slow down there. Try again in ${rateLimitResult.resetInSeconds} seconds.` 
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': (rateLimitResult.resetInSeconds || 0).toString(),
            'X-RateLimit-Burst-Limit': BURST_LIMIT.toString(),
            'Retry-After': (rateLimitResult.resetInSeconds || 60).toString(),
            'X-Rate-Limit-Policy': 'sliding-window'
          }
        }
      );
    }
    
    // Calculate remaining requests for headers
    const record = ipRequests.get(clientIp);
    const remainingRequests = record ? Math.max(0, RATE_LIMIT_MAX_REQUESTS - record.count) : RATE_LIMIT_MAX_REQUESTS;
    const resetTime = record ? Math.ceil((record.resetTime - Date.now()) / 1000) : RATE_LIMIT_WINDOW / 1000;
    const burstRemaining = record ? Math.max(0, BURST_LIMIT - record.requestTimestamps.length) : BURST_LIMIT;

    try {
      // Option 2: Batch request (more efficient)
      const allSupplies = await fetchAllSupplies();
      const results = Object.entries(TOKENS).map(([symbol, type]) => ({
        symbol,
        supply: allSupplies[type].toString()
      }));

      const total = results
        .reduce((sum, { supply }) => sum + BigInt(supply), BigInt(0))
        .toString();
        
      const responseData = { 
        supplies: results, 
        total,
        cached: cache.size > 0
      };
      
      // Generate ETag for response
      const etag = generateETag(responseData);
      
      return NextResponse.json(responseData, {
        headers: {
          'Cache-Control': 's-maxage=60, stale-while-revalidate=30',
          'ETag': etag,
          'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
          'X-RateLimit-Remaining': remainingRequests.toString(),
          'X-RateLimit-Reset': resetTime.toString(),
          'X-RateLimit-Burst-Limit': BURST_LIMIT.toString(),
          'X-RateLimit-Burst-Remaining': burstRemaining.toString()
        }
      });
    } catch (error) {
      // Handle partial data scenario without detailed error logging
      console.warn('Error fetching complete supply data');
      
      // Try to return partial data if possible
      const partialResults = [];
      let partialTotal = BigInt(0);
      let hasPartialData = false;
      
      for (const [symbol, type] of Object.entries(TOKENS)) {
        const cached = cache.get(type);
        if (cached) {
          hasPartialData = true;
          partialResults.push({
            symbol,
            supply: cached.value.toString()
          });
          partialTotal += cached.value;
        } else {
          // Include token with null supply to indicate missing data
          partialResults.push({
            symbol,
            supply: null,
            error: "Data unavailable"
          });
        }
      }
      
      if (hasPartialData) {
        return NextResponse.json({
          supplies: partialResults,
          total: partialTotal.toString(),
          cached: true,
          partial: true,
          message: "Some data could not be fetched. Showing partial results with cached data."
        }, { 
          status: 206, // 206 Partial Content
          headers: {
            'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
            'X-RateLimit-Remaining': remainingRequests.toString(),
            'X-RateLimit-Reset': resetTime.toString(),
            'X-RateLimit-Burst-Limit': BURST_LIMIT.toString(),
            'X-RateLimit-Burst-Remaining': burstRemaining.toString()
          }
        });
      }
      
      // If we have no data at all, throw to return 500
      throw error;
    }
  } catch (error) {
    console.error('API request failed:', error);
    // Don't expose internal error details to client
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to process request' },
      { status: 500 }
    );
  }
}
