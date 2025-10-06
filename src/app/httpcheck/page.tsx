"use client";

import Link from "next/link";
import { useRef, useState } from "react";

type ThreatMatch = {
  threatType?: string;
  platformType?: string;
  threat?: { url?: string };
  cacheDuration?: string;
};

type ApiResp = {
  matches?: ThreatMatch[];
  error?: unknown;
};

function normalizeUrl(input: string) {
  const t = input.trim();
  if (!t) return "";
  // ถ้าผู้ใช้พิมพ์โดเมนเปล่า ๆ เติม http:// ให้
  if (!/^https?:\/\//i.test(t)) return "http://" + t;
  return t;
}

export default function SafeBrowsingPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ThreatMatch[] | null>(null);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const target = normalizeUrl(url);
    if (!target) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const r = await fetch(
        `/api/httpcheck?url=${encodeURIComponent(target)}`,
        {
          cache: "no-store",
        }
      );
      const ct = r.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const t = await r.text();
        throw new Error(`HTTP ${r.status}: ${t.slice(0, 200)}`);
      }
      const data: ApiResp = await r.json();
      if (!r.ok) throw new Error((data as any)?.error || `HTTP ${r.status}`);
      setResult(data.matches ?? []);
      setCheckedAt(new Date());
    } catch (err: any) {
      setError(err?.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  const isUnsafe = (result?.length ?? 0) > 0;

  const examples = [
    {
      label: "Phishing (ทดสอบ)",
      href: "https://testsafebrowsing.appspot.com/s/phishing.html",
    },
    {
      label: "Malware (ทดสอบ)",
      href: "https://testsafebrowsing.appspot.com/s/malware.html",
    },
    {
      label: "Unwanted (ทดสอบ)",
      href: "https://testsafebrowsing.appspot.com/s/unwanted.html",
    },
  ];

  return (
    <main className="min-h-dvh bg-gradient-to-b from-slate-50 via-white to-slate-50 text-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b bg-white/70 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-emerald-600 grid place-items-center text-white">
              🛡️
            </div>
            <h1 className="text-lg md:text-xl font-bold">URL Safety Check</h1>
          </div>
          <Link
            href="/"
            className="text-sm rounded-full px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            ← กลับหน้าแรก
          </Link>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-4 py-6">
        {/* Search Card */}
        <div className="rounded-2xl border bg-white/80 backdrop-blur p-4 md:p-5 shadow-sm">
          <form
            ref={formRef}
            onSubmit={onSubmit}
            className="flex flex-col md:flex-row gap-3"
          >
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                🔗
              </span>
              <input
                type="text"
                className="w-full pl-9 pr-20 py-2.5 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="วางลิงก์ เช่น https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const composing =
                      (e as any).isComposing ||
                      (e.nativeEvent as any).isComposing;
                    if (!composing) {
                      e.preventDefault();
                      formRef.current?.requestSubmit(); // ยิง submit เหมือนกดปุ่ม
                    }
                  }
                }}
              />
              {url && (
                <button
                  type="button"
                  onClick={() => setUrl("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs rounded-full px-2 py-1 ring-1 ring-gray-200 bg-white hover:bg-gray-50"
                  aria-label="ล้างค่า"
                  title="ล้างค่า"
                >
                  ล้าง
                </button>
              )}
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm"
              disabled={loading}
            >
              {loading ? "กำลังตรวจ..." : "ตรวจ URL"}
            </button>
          </form>

          {/* Example pills */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500">ตัวอย่างทดสอบ:</span>
            {examples.map((ex) => (
              <button
                key={ex.href}
                type="button"
                onClick={() => setUrl(ex.href)}
                className="text-xs px-3 py-1.5 rounded-full ring-1 ring-gray-200 bg-white hover:bg-gray-50 transition"
                title={ex.href}
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>

        {/* States */}
        {/* Error */}
        {error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            ⚠️ เกิดข้อผิดพลาด: {error}
          </div>
        )}

        {/* Skeleton */}
        {loading && (
          <div className="mt-4 rounded-2xl border bg-white p-5 animate-pulse">
            <div className="h-4 w-1/3 bg-gray-200 rounded mb-3" />
            <div className="h-5 w-2/3 bg-gray-200 rounded mb-4" />
            <div className="h-3 w-1/2 bg-gray-200 rounded" />
          </div>
        )}

        {/* Result */}
        {!loading && result && (
          <div
            className={`mt-4 rounded-2xl p-5 border ${
              isUnsafe
                ? "border-red-300 bg-red-50"
                : "border-emerald-300 bg-emerald-50"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm text-gray-600">
                  {checkedAt ? `ตรวจล่าสุด: ${checkedAt.toLocaleString()}` : ""}
                </div>
                <div className="mt-1 text-2xl font-semibold">
                  สถานะ:{" "}
                  {isUnsafe ? (
                    <span className="text-red-700">ไม่ปลอดภัย (พบในลิสต์)</span>
                  ) : (
                    <span className="text-emerald-700">
                      ปลอดภัย (ไม่พบรายการ)
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                {url && (
                  <a
                    href={normalizeUrl(url)}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg text-sm ring-1 ring-gray-200 bg-white hover:bg-gray-50"
                  >
                    เปิดลิงก์ ↗
                  </a>
                )}
                {url && (
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(normalizeUrl(url));
                      } catch {}
                    }}
                    className="px-3 py-1.5 rounded-lg text-sm ring-1 ring-gray-200 bg-white hover:bg-gray-50"
                  >
                    คัดลอกลิงก์
                  </button>
                )}
              </div>
            </div>

            {isUnsafe ? (
              <ul className="mt-4 space-y-3">
                {result!.map((m, i) => (
                  <li key={i} className="rounded-xl border bg-white p-3">
                    <div className="text-sm">
                      <b>ThreatType:</b> {m.threatType || "-"}{" "}
                      <span className="text-gray-400">·</span> <b>Platform:</b>{" "}
                      {m.platformType || "ANY_PLATFORM"}
                    </div>
                    <div className="text-sm break-all">
                      <b>URL:</b> {m.threat?.url || "-"}
                    </div>
                    {m.cacheDuration && (
                      <div className="text-xs text-gray-500">
                        Cache: {m.cacheDuration}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-gray-700">
                หมายเหตุ: “ไม่พบ” = ลิงก์ยังไม่อยู่ในลิสต์ของ Google Safe
                Browsing ณ ตอนนี้ (ไม่ได้การันตีความปลอดภัย 100% เสมอไป)
              </p>
            )}
          </div>
        )}

        {/* Empty */}
        {!loading && !result && !error && (
          <div className="mt-4 rounded-2xl border border-dashed bg-white p-6 text-gray-600">
            วาง URL เพื่อเริ่มตรวจ—ระบบจะเทียบกับลิสต์ฟิชชิ่ง/มัลแวร์ของ Google
            แบบเรียลไทม์
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-4 py-8 text-center text-xs text-gray-500">
        ขับเคลื่อนด้วย Google Safe Browsing API
      </footer>
    </main>
  );
}
