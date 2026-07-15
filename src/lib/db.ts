import { Pool, types } from "pg";

// dateカラム(due_date, report_date等)は既定でJavaScriptのDateオブジェクトに変換され、
// JSON化する際に "2026-07-20T00:00:00.000Z" のようなタイムスタンプ形式になってしまう。
// 時刻を持たない純粋な日付として、Postgresが返す "YYYY-MM-DD" の文字列のまま扱う
types.setTypeParser(types.builtins.DATE, (value) => value);

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL が設定されていません");
    }
    pool = new Pool({ connectionString });
  }
  return pool;
}

export async function query<T extends object = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const result = await getPool().query(text, params);
  return result.rows as T[];
}

export async function queryOne<T extends object = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
