// タイ在住者向けツールのサーバー側。
// - /api/* : 通知の登録・解除・テスト
// - それ以外 : site/ の静的ファイル（wrangler.toml の assets）
// - 毎朝（cron）: 90日レポートの期限が近い人にプッシュ通知を送る
//
// 通知は「中身なし」のプッシュで送る。文面は端末の sw.js が、端末に保存した日付から作る。
// こうすると暗号化の処理がいらず、サーバーに置くのは「宛先」と「期限日」だけで済む。

// 期限日から見て、何日前に通知するか（マイナスは期限後）
// 15日前＝報告できる初日、3日前、当日、期限後6日目＝最終日の前日
export const OFFSETS = [15, 3, 0, -6];

// 送ってよい通知サービス（ここ以外の宛先にはリクエストを出さない）
const PUSH_HOSTS = ["fcm.googleapis.com", "push.services.mozilla.com", "push.apple.com", "notify.windows.com"];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    try {
      await ensureSchema(env);
      return await api(request, env, url);
    } catch (e) {
      return json({ error: String(e && e.message || e) }, 500);
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil((async () => { await ensureSchema(env); await sendDue(env); })());
  },
};

// ---------------- API ----------------

async function api(request, env, url) {
  await remember(env, "site", url.origin);
  const path = url.pathname;

  if (path === "/api/vapid" && request.method === "GET") {
    const keys = await vapidKeys(env);
    return json({ key: keys.pub });
  }
  if (request.method !== "POST") return json({ error: "not found" }, 404);

  const body = await request.json().catch(() => ({}));
  const sub = body.subscription || {};
  if (!validEndpoint(sub.endpoint)) return json({ error: "bad endpoint" }, 400);

  if (path === "/api/subscribe") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.due || "")) return json({ error: "bad date" }, 400);
    const lang = body.lang === "en" ? "en" : "ja";
    const now = new Date().toISOString();
    await env.DB.prepare(
      `INSERT INTO subs (endpoint, due, lang, created, updated) VALUES (?1, ?2, ?3, ?4, ?4)
       ON CONFLICT(endpoint) DO UPDATE SET due = ?2, lang = ?3, updated = ?4`
    ).bind(sub.endpoint, body.due, lang, now).run();
    return json({ ok: true });
  }
  if (path === "/api/unsubscribe") {
    await env.DB.prepare("DELETE FROM subs WHERE endpoint = ?1").bind(sub.endpoint).run();
    return json({ ok: true });
  }
  if (path === "/api/test") {
    const row = await env.DB.prepare("SELECT endpoint FROM subs WHERE endpoint = ?1").bind(sub.endpoint).first();
    if (!row) return json({ error: "not subscribed" }, 404);
    const status = await push(env, sub.endpoint);
    return json({ ok: status >= 200 && status < 300, status });
  }
  return json({ error: "not found" }, 404);
}

function validEndpoint(e) {
  if (typeof e !== "string" || e.length > 1000) return false;
  try {
    const u = new URL(e);
    return u.protocol === "https:" && PUSH_HOSTS.some(h => u.hostname === h || u.hostname.endsWith("." + h));
  } catch { return false; }
}

// ---------------- 毎朝の通知 ----------------

export function bangkokToday(now = Date.now()) {
  return new Date(now + 7 * 3600 * 1000).toISOString().slice(0, 10);
}
export function addDays(ymd, n) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
// 今日通知すべき期限日のリスト
export function dueDatesFor(today) {
  return OFFSETS.map(o => addDays(today, o));
}

async function sendDue(env) {
  const today = bangkokToday();
  const dues = dueDatesFor(today);
  const { results } = await env.DB.prepare(
    `SELECT endpoint FROM subs WHERE due IN (?1, ?2, ?3, ?4)`
  ).bind(...dues).all();
  for (const r of results) {
    const status = await push(env, r.endpoint).catch(() => 0);
    if (status === 404 || status === 410) {
      await env.DB.prepare("DELETE FROM subs WHERE endpoint = ?1").bind(r.endpoint).run();
    }
  }
  // 期限から60日以上たって更新されていない登録は消す
  await env.DB.prepare("DELETE FROM subs WHERE due < ?1").bind(addDays(today, -60)).run();
  return results.length;
}

// ---------------- Web Push（VAPID） ----------------

async function push(env, endpoint) {
  const keys = await vapidKeys(env);
  const auth = await vapidHeader(endpoint, keys, await recall(env, "site"));
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: auth, TTL: "86400", Urgency: "high", "Content-Length": "0" },
  });
  return res.status;
}

// 鍵は初回に自動で作って D1 に保存する（手で秘密鍵を扱わなくて済む）
async function vapidKeys(env) {
  const saved = await recall(env, "vapid");
  if (saved) return JSON.parse(saved);
  const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const jwk = await crypto.subtle.exportKey("jwk", kp.privateKey);
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", kp.publicKey));
  await env.DB.prepare("INSERT OR IGNORE INTO config (k, v) VALUES ('vapid', ?1)")
    .bind(JSON.stringify({ jwk, pub: b64u(raw) })).run();
  return JSON.parse(await recall(env, "vapid")); // 同時に作られても、先に保存された方を使う
}

export async function vapidHeader(endpoint, keys, site) {
  const enc = (o) => b64u(new TextEncoder().encode(JSON.stringify(o)));
  const claims = {
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: site && site.startsWith("https://") ? site : "mailto:noreply@example.com",
  };
  const unsigned = enc({ typ: "JWT", alg: "ES256" }) + "." + enc(claims);
  const key = await crypto.subtle.importKey("jwk", keys.jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(unsigned));
  return `vapid t=${unsigned}.${b64u(new Uint8Array(sig))}, k=${keys.pub}`;
}

// ---------------- 小物 ----------------

let schemaReady = false;
async function ensureSchema(env) {
  if (schemaReady) return;
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS subs (
      endpoint TEXT PRIMARY KEY, due TEXT NOT NULL, lang TEXT, created TEXT, updated TEXT)`),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS subs_due ON subs (due)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS config (k TEXT PRIMARY KEY, v TEXT)"),
  ]);
  schemaReady = true;
}
async function recall(env, k) {
  const row = await env.DB.prepare("SELECT v FROM config WHERE k = ?1").bind(k).first();
  return row ? row.v : null;
}
async function remember(env, k, v) {
  await env.DB.prepare("INSERT INTO config (k, v) VALUES (?1, ?2) ON CONFLICT(k) DO UPDATE SET v = ?2").bind(k, v).run();
}
function b64u(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8" } });
}
