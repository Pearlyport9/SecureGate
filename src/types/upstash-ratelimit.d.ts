declare module "@upstash/ratelimit" {
  import { Redis } from "@upstash/redis";

  interface RatelimitConfig {
    redis: Redis;
    limiter: RatelimitLimiter;
    prefix?: string;
    timeout?: number;
    analytics?: boolean;
    ephemeralCache?: Map<string, number>;
    enableProtection?: boolean;
  }

  interface RatelimitLimiter {
    allowed: (tokens: number) => number;
    get: (tokens: number) => {
      tokens: number;
      refill: number;
      refillTime: number;
      window: number;
    };
  }

  interface RatelimitResponse {
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
  }

  export class Ratelimit {
    constructor(config: RatelimitConfig);
    limit(identifier: string): Promise<RatelimitResponse>;
    blockUntil(identifier: string, duration: number): Promise<boolean>;
    static slidingWindow(maxRequests: number, window: string): RatelimitLimiter;
    static fixedWindow(maxRequests: number, window: string): RatelimitLimiter;
    static tokenBucket(tokens: number, refillRate: number, refillInterval: number): RatelimitLimiter;
    static cachedFixedWindow(maxRequests: number, window: string): RatelimitLimiter;
  }

  export class MultiRegionRatelimit {
    constructor(config: RatelimitConfig & { redis: Redis[] });
    limit(identifier: string): Promise<RatelimitResponse>;
  }
}
