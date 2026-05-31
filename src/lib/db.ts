import { getRequestContext } from "@cloudflare/next-on-pages";

export function getDB(): D1Database {
  const ctx = getRequestContext();
  return ctx.env.DB;
}

export async function dbQuery<T = unknown>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const db = getDB();
  const stmt = db.prepare(sql);
  const result = await (params.length > 0 ? stmt.bind(...params) : stmt).all<T>();
  return result.results;
}

export async function dbFirst<T = unknown>(
  sql: string,
  params: unknown[] = []
): Promise<T | null> {
  const db = getDB();
  const stmt = db.prepare(sql);
  return (params.length > 0 ? stmt.bind(...params) : stmt).first<T>();
}

export async function dbRun(
  sql: string,
  params: unknown[] = []
): Promise<D1Result> {
  const db = getDB();
  const stmt = db.prepare(sql);
  return (params.length > 0 ? stmt.bind(...params) : stmt).run();
}
