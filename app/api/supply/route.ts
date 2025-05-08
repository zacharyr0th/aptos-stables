// Next.js 13+ "app router" style.  For the older "pages" router,
// rename the file to /pages/api/supply.ts and replace the export.

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { z } from 'zod';

/** 1) Indexer GraphQL endpoint (public, no key required) */
const INDEXER = 'https://indexer.mainnet.aptoslabs.com/v1/graphql';

/** 2) Asset‑type strings straight from the projects' docs / explorers */
const TOKENS: Record<string, string> = {
  // Using the short form addresses (without the module::struct part)
  USDt:  '0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b',  // Tether
  USDC:  '0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b',  // Circle native
  USDe:  '0xf37a8864fe737eb8ec2c2931047047cbaed1beed3fb0e5b7c5526dafd3b9c2e9',  // Ethena
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

  get(key: string): { value: bigint; timestamp: number } | undefined {
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
    
    return { value: entry.value, timestamp: entry.timestamp };
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
const CACHE_TTL = 60000; // 60 seconds (increased from 5 seconds)
const MAX_CACHE_SIZE = 100; // Maximum number of entries to prevent unbounded growth
const cache = new LRUCache(MAX_CACHE_SIZE, CACHE_TTL);

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60000; // 1 minute window
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute
const ipRequests = new Map<string, { count: number; resetTime: number }>();

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
  // Get headers object in Next.js App Router
  const headersList = await headers();
  
  // Try different headers for IP, depending on your deployment setup
  const forwardedFor = headersList.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIp = headersList.get('x-real-ip');
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
      resetTime: now + RATE_LIMIT_WINDOW 
    });
    return { allowed: true };
  }
  
  // Increment request count
  record.count++;
  
  // Check if over limit
  if (record.count > RATE_LIMIT_MAX_REQUESTS) {
    const resetInSeconds = Math.ceil((record.resetTime - now) / 1000);
    return { allowed: false, resetInSeconds };
  }
  
  return { allowed: true };
}

// Clean up expired rate limit entries and stale cache entries periodically
// Use self-invocation rather than setInterval to ensure cleanup 
// continues even if errors occur in a cleanup cycle
let cleanupTimeout: NodeJS.Timeout | null = null;

function scheduleCleanup() {
  cleanupTimeout = setTimeout(() => {
    try {
      const now = Date.now();
      
      // Clean up rate limit entries
      for (const [ip, data] of ipRequests.entries()) {
        if (now >= data.resetTime) {
          ipRequests.delete(ip);
        }
      }
      
      // Clean up stale cache entries
      cache.cleanExpired();
      
    } catch (error) {
      console.error('Error during cleanup:', error);
    } finally {
      // Always reschedule regardless of success/failure
      scheduleCleanup();
    }
  }, 60000); // Run cleanup every minute
}

// Start the cleanup process
scheduleCleanup();

/** Fetch supply for a specific token with memoization */
async function fetchSupply(assetType: string): Promise<bigint> {
  const cached = cache.get(assetType);
  
  if (cached) {
    return cached.value;
  }

  try {
    const r = await fetch(INDEXER, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: GQL, variables: { types: [assetType] } }),
      cache: 'no-store',
    });

    // Check for rate limiting or server errors
    if (r.status === 429) {
      console.warn(`Rate limit reached for ${assetType}`);
      // Return cached value if available (even if expired)
      if (cached) return cached.value;
      throw new Error(`Rate limited by Aptos Indexer`);
    }

    if (!r.ok) throw new Error(`API request failed with status ${r.status}`);

    const responseData = await r.json();
    
    // Validate response structure
    const validatedResponse = GraphQLResponseSchema.safeParse(responseData);
    
    if (!validatedResponse.success) {
      console.error('Invalid response structure:', validatedResponse.error);
      // Return cached value if available (even if expired)
      if (cached) return cached.value;
      throw new Error('Data validation error');
    }
    
    const { data, errors } = validatedResponse.data;
    
    if (errors && errors.length > 0) {
      console.error('GraphQL errors:', errors);
      // Return cached value if available (even if expired)
      if (cached) return cached.value;
      throw new Error('Data fetch error');
    }

    const result = data.fungible_asset_metadata.find(
      (item) => item.asset_type === assetType
    );
    
    if (!result?.supply_v2) {
      // Return cached value if available (even if expired)
      if (cached) return cached.value;
      throw new Error(`Supply data unavailable`);
    }

    const supply = BigInt(result.supply_v2);
    cache.set(assetType, supply);
    return supply;
  } catch (error) {
    console.error(`Failed to fetch supply for ${assetType}:`, error);
    // Return cached value if available (even if expired)
    if (cached) {
      console.log(`Using cached data for ${assetType}`);
      return cached.value;
    }
    throw new Error(`Failed to fetch supply data`);
  }
}

/** Fetch all supplies in a single GraphQL query */
async function fetchAllSupplies(): Promise<Record<string, bigint>> {
  const tokenTypes = Object.values(TOKENS);
  const missingTypes = tokenTypes.filter(type => !cache.has(type));
  
  if (missingTypes.length === 0) {
    // Return all from cache
    return Object.fromEntries(
      tokenTypes.map(type => {
        const entry = cache.get(type);
        return [type, entry!.value];
      })
    );
  }
  
  try {
    const r = await fetch(INDEXER, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: GQL, variables: { types: missingTypes } }),
      cache: 'no-store',
    });

    // Check for rate limiting
    if (r.status === 429) {
      console.warn('Rate limit reached from Aptos Indexer, using cached data where available');
      // Fall back to cached values, even if expired
      return Object.fromEntries(
        tokenTypes.map(type => {
          const cached = cache.get(type);
          if (cached) return [type, cached.value];
          throw new Error(`No cached data available for ${type} during rate limiting`);
        })
      );
    }

    if (!r.ok) throw new Error(`API request failed with status ${r.status}`);

    const responseData = await r.json();
    
    // Validate response structure
    const validatedResponse = GraphQLResponseSchema.safeParse(responseData);
    
    if (!validatedResponse.success) {
      console.error('Invalid response structure:', validatedResponse.error);
      // Fall back to cached values
      return fallbackToCachedValues(tokenTypes);
    }
    
    const { data, errors } = validatedResponse.data;
    
    if (errors && errors.length > 0) {
      console.error('GraphQL errors:', errors);
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
    
    // Check for missing types in the response
    const missingFromResponse = missingTypes.filter(type => !updatedTypes.has(type));
    if (missingFromResponse.length > 0) {
      console.warn(`Missing data for tokens: ${missingFromResponse.join(', ')}`);
    }
    
    // Return combined data (newly fetched + cached)
    return Object.fromEntries(
      tokenTypes.map(type => {
        const cached = cache.get(type);
        if (!cached) {
          console.error(`No data available for ${type}`);
          throw new Error(`Supply data unavailable for ${type}`);
        }
        return [type, cached.value];
      })
    );
  } catch (error) {
    console.error('Failed to fetch supplies:', error);
    // Try to return as much cached data as possible
    return fallbackToCachedValues(tokenTypes);
  }
}

// Helper function to return cached values in error scenarios
function fallbackToCachedValues(tokenTypes: string[]): Record<string, bigint> {
  const result: Record<string, bigint> = {};
  let missingTokens: string[] = [];
  
  tokenTypes.forEach(type => {
    const cached = cache.get(type);
    if (cached) {
      result[type] = cached.value;
    } else {
      missingTokens.push(type);
    }
  });
  
  if (missingTokens.length > 0) {
    console.error(`No cached data available for: ${missingTokens.join(', ')}`);
    throw new Error(`Missing data for some tokens: ${missingTokens.join(', ')}`);
  }
  
  return result;
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
          message: `Too many requests. Try again in ${rateLimitResult.resetInSeconds} seconds.` 
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
            'X-RateLimit-Reset': (rateLimitResult.resetInSeconds || 0).toString(),
            'Retry-After': (rateLimitResult.resetInSeconds || 60).toString()
          }
        }
      );
    }
    
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

      return NextResponse.json({ 
        supplies: results, 
        total,
        cached: cache.size > 0
      });
    } catch (error) {
      // Handle partial data scenario
      console.error('Error fetching all supplies:', error);
      
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
        }, { status: 206 }); // 206 Partial Content
      }
      
      // If we have no data at all, throw to return 500
      throw error;
    }
  } catch (error) {
    console.error('Supply API error:', error);
    // Don't expose internal error details to client
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to process request' },
      { status: 500 }
    );
  }
}
