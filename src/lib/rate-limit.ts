import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let _redis: Redis | undefined;
function getRedis() {
  if (!_redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
      throw new Error(
        "Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN environment variables."
      );
    }
    _redis = new Redis({ url, token });
  }
  return _redis;
}

function lazyLimiter(limiter: ReturnType<typeof Ratelimit.slidingWindow>, prefix: string): Ratelimit {
  let instance: Ratelimit | undefined;
  return new Proxy({} as Ratelimit, {
    get(_, prop) {
      if (!instance) {
        instance = new Ratelimit({ redis: getRedis(), limiter, prefix });
      }
      return Reflect.get(instance, prop);
    },
  });
}

export const loginLimiter = lazyLimiter(Ratelimit.slidingWindow(5, "60 s"), "ratelimit:login");
export const forgotPasswordLimiter = lazyLimiter(Ratelimit.slidingWindow(3, "15 m"), "ratelimit:forgot");
export const signupLimiter = lazyLimiter(Ratelimit.slidingWindow(3, "15 m"), "ratelimit:signup");
export const resetPasswordLimiter = lazyLimiter(Ratelimit.slidingWindow(5, "10 m"), "ratelimit:resetpw");
export const verifyEmailLimiter = lazyLimiter(Ratelimit.slidingWindow(10, "10 m"), "ratelimit:verify");
export const resendVerificationLimiter = lazyLimiter(Ratelimit.slidingWindow(3, "15 m"), "ratelimit:resend");
