// 90日レポート：オフライン表示と通知
// 通知は中身なしで届く。文面は、画面が保存した期限日（state.json）からここで作る。
const VERSION = "90day-v1";
const FILES = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith("90day-v") && k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.pathname.startsWith("/api/")) return;
  if (url.origin === location.origin) {
    // 自分のファイル：ネット優先、だめならキャッシュ（更新がすぐ届くように）
    e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(VERSION).then((x) => x.put(e.request, c)); return r; })
      .catch(() => caches.match(e.request)));
  } else {
    // フォント：キャッシュ優先
    e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((r) => { const c = r.clone(); caches.open(VERSION).then((x) => x.put(e.request, c)); return r; })));
  }
});

const TEXT = {
  ja: { title: "90日レポート", open: (d, due) => `今日から報告できます。期限は${due}です。`, left: (d, due) => `期限まであと${d}日です（${due}）。`,
        today: () => "今日が期限です。", late: (d, due, last) => `期限を過ぎています。最終日は${last}です。`, fine: () => "最終日を過ぎました。早めに報告してください。",
        none: () => "期限の日付を確認してください。" },
  en: { title: "90-Day Report", open: (d, due) => `You can report from today. Due ${due}.`, left: (d, due) => `${d} days until your report is due (${due}).`,
        today: () => "Your 90-day report is due today.", late: (d, due, last) => `Overdue. The last day is ${last}.`, fine: () => "Past the last day. Please report soon.",
        none: () => "Please check your due date." },
};

function message(state) {
  const lang = state && state.lang === "en" ? "en" : "ja", t = TEXT[lang];
  if (!state || !state.due) return { title: t.title, body: t.none() };
  const [y, m, d] = state.due.split("-").map(Number);
  const due = new Date(y, m - 1, d), now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((due - today) / 86400000);
  const last = new Date(y, m - 1, d + 7);
  const f = (x) => lang === "ja" ? `${x.getMonth() + 1}月${x.getDate()}日` : x.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  let body;
  if (diff >= 15) body = t.open(diff, f(due));
  else if (diff > 0) body = t.left(diff, f(due));
  else if (diff === 0) body = t.today();
  else if (diff >= -7) body = t.late(-diff, f(due), f(last));
  else body = t.fine();
  return { title: t.title, body };
}

self.addEventListener("push", (e) => {
  e.waitUntil((async () => {
    let state = null;
    try {
      const hit = await (await caches.open("90day-state")).match(new URL("state.json", self.registration.scope));
      if (hit) state = await hit.json();
    } catch {}
    const { title, body } = message(state);
    await self.registration.showNotification(title, {
      body, icon: "icon-192.png", badge: "icon-192.png", tag: "90day", renotify: true, data: { url: self.registration.scope },
    });
  })());
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil((async () => {
    const all = await clients.matchAll({ type: "window", includeUncontrolled: true });
    const open = all.find((c) => c.url.startsWith(self.registration.scope));
    if (open) return open.focus();
    return clients.openWindow(self.registration.scope);
  })());
});
