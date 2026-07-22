import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

function getEnv(name: string): string {
  const value = import.meta.env[name];
  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${name}. Configúrala en .env (local) o en Vercel Environment Variables.`
    );
  }
  return value;
}

let _redis: Redis | null = null;

function getRedisClient(): Redis {
  if (_redis) return _redis;
  _redis = new Redis({
    url: getEnv('UPSTASH_REDIS_REST_URL'),
    token: getEnv('UPSTASH_REDIS_REST_TOKEN'),
  });
  return _redis;
}

export const redis = new Proxy({} as Redis, {
  get(_target, prop, receiver) {
    const client = getRedisClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

let _ratelimit: Ratelimit | null = null;

function getRatelimitInstance(): Ratelimit {
  if (_ratelimit) return _ratelimit;
  _ratelimit = new Ratelimit({
    redis: getRedisClient(),
    limiter: Ratelimit.slidingWindow(10, '60 s'),
    prefix: 'farmaturno:ratelimit',
  });
  return _ratelimit;
}

export const ratelimit = new Proxy({} as Ratelimit, {
  get(_target, prop, receiver) {
    const instance = getRatelimitInstance();
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});
