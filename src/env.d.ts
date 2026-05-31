// Augment the CloudflareEnv interface with our bindings
interface CloudflareEnv {
  DB: D1Database;
  SESSIONS: KVNamespace;
  ANTHROPIC_API_KEY: string;
  JWT_SECRET: string;
}
