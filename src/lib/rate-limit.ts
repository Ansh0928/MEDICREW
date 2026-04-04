// src/lib/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let _ratelimit: Ratelimit | null = null;

function getRatelimit(): Ratelimit | null {
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    return null;
  }
  if (!_ratelimit) {
    _ratelimit = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(5, "60 s"),
      prefix: "medicrew:rl",
    });
  }
  return _ratelimit;
}

export async function checkRateLimit(
  ip: string,
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const ratelimit = getRatelimit();
  if (!ratelimit) {
    return { allowed: true };
  }
  const { success, reset } = await ratelimit.limit(ip);
  if (!success) {
    return {
      allowed: false,
      retryAfter: Math.ceil((reset - Date.now()) / 1000),
    };
  }
  return { allowed: true };
}
