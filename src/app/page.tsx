"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

type ClaimReview = {
  publisher?: { name?: string; site?: string };
  url?: string;
  title?: string;
  textualRating?: string;
  reviewDate?: string;
  languageCode?: string;
};

type Claim = {
  text?: string;
  claimant?: string;
  claimDate?: string;
  claimReview?: ClaimReview[];
};

type ApiResp = {
  claims?: Claim[];
  nextPageToken?: string;
  error?: unknown;
};

const ratingsColor: Record<string, string> = {
  false: "bg-red-100 text-red-700 ring-red-200",
  misleading: "bg-amber-100 text-amber-700 ring-amber-200",
  true: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  correct: "bg-emerald-100 text-emerald-700 ring-emerald-200",
};

function Badge({ label }: { label?: string }) {
  const key = (label || "").toLowerCase();
  const cls = ratingsColor[key] || "bg-gray-100 text-gray-700 ring-gray-200";
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs ring-1 ${cls}`}
    >
      {label ?? "-"}
    </span>
  );
}

function Pill({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "px-3 py-1.5 rounded-full text-sm ring-1 transition",
        active
          ? "bg-blue-600 text-white ring-blue-600 shadow-sm"
          : "bg-white text-gray-700 ring-gray-200 hover:bg-gray-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function Page() {
  const [q, setQ] = useState("");
  const [lang, setLang] = useState<"th" | "en">("th");
  const [items, setItems] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [ratingFilter, setRatingFilter] = useState<string>("");
  const formRef = useRef<HTMLFormElement>(null);

  const filtered = useMemo(() => {
    if (!ratingFilter) return items;
    return items.filter((c) =>
      (c.claimReview ?? []).some((r) =>
        (r.textualRating || "")
          .toLowerCase()
          .includes(ratingFilter.toLowerCase())
      )
    );
  }, [items, ratingFilter]);

  async function fetchClaims(opts: { append?: boolean; pageToken?: string }) {
    const { append, pageToken } = opts;
    const url = new URL("/api/factcheck", window.location.origin);
    url.searchParams.set("query", q.trim());
    url.searchParams.set("lang", lang);
    url.searchParams.set("pageSize", "10");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const isLoadMore = Boolean(pageToken);
    try {
      !isLoadMore ? setLoading(true) : setLoadingMore(true);
      setError(null);

      const r = await fetch(url.toString(), { cache: "no-store" });
      const ct = r.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const text = await r.text();
        throw new Error(`HTTP ${r.status}: ${text.slice(0, 200)}`);
      }

      const data: ApiResp = await r.json();
      if (!r.ok) throw new Error((data as any)?.error || `HTTP ${r.status}`);

      setNextToken(data.nextPageToken ?? null);
      setItems((prev) =>
        append ? [...prev, ...(data.claims ?? [])] : data.claims ?? []
      );
    } catch (e: any) {
      setError(e?.message || "เกิดข้อผิดพลาด");
      if (!append) setItems([]);
    } finally {
      !isLoadMore ? setLoading(false) : setLoadingMore(false);
    }
  }

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setNextToken(null);
    await fetchClaims({ append: false });
  }

  async function onLoadMore() {
    if (!nextToken) return;
    await fetchClaims({ append: true, pageToken: nextToken });
  }

  return (
    <main className="min-h-dvh bg-gradient-to-b from-slate-50 via-white to-slate-50 text-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b bg-white/70 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-blue-600 grid place-items-center text-white">
              ✓
            </div>
            <h1 className="text-lg md:text-xl font-bold">FactCheck</h1>
          </div>

          <Link
            href="/httpcheck"
            className="rounded-full px-3 py-1.5 text-sm bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm"
          >
            🛡️ ตรวจ URL ปลอดภัย/ไม่ปลอดภัย
          </Link>
        </div>
      </header>

      {/* Search Card */}
      <section className="max-w-5xl mx-auto px-4 pt-6">
        <div className="rounded-2xl border bg-white/80 backdrop-blur p-4 md:p-5 shadow-sm">
          <form
            ref={formRef}
            onSubmit={onSearch}
            className="flex flex-col md:flex-row gap-3"
          >
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                🔎
              </span>
              <input
                id="search-input"
                type="text"
                aria-label="หัวข้อค้นหา"
                className="w-full pl-9 pr-12 py-2.5 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="พิมพ์คำค้น เช่น วัคซีนโควิด, election fraud..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const composing =
                      (e as any).isComposing ||
                      (e.nativeEvent as any).isComposing;
                    if (!composing) {
                      e.preventDefault();
                      formRef.current?.requestSubmit();
                    }
                  }
                }}
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs rounded-full px-2 py-1 ring-1 ring-gray-200 bg-white hover:bg-gray-50"
                  aria-label="ล้างค่า"
                  title="ล้างค่า"
                >
                  ล้าง
                </button>
              )}
            </div>
            <div className="flex gap-2 items-center">
              <select
                className="border px-3 py-2 rounded-xl"
                value={lang}
                onChange={(e) => setLang(e.target.value as "th" | "en")}
                title="Language"
                aria-label="เลือกภาษา"
              >
                <option value="th">TH</option>
                <option value="en">EN</option>
              </select>
              <button
                className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm"
                type="submit"
                disabled={loading}
              >
                {loading ? "กำลังค้นหา..." : "ค้นหา"}
              </button>
            </div>
          </form>

          {/* Filter Pills + Stats */}
          <div className="mt-4 flex flex-wrap items-center gap-2 justify-between">
            <div className="flex gap-2">
              <Pill
                active={ratingFilter === ""}
                onClick={() => setRatingFilter("")}
              >
                ทั้งหมด
              </Pill>
              <Pill
                active={ratingFilter === "false"}
                onClick={() => setRatingFilter("false")}
              >
                False
              </Pill>
              <Pill
                active={ratingFilter === "misleading"}
                onClick={() => setRatingFilter("misleading")}
              >
                Misleading
              </Pill>
              <Pill
                active={ratingFilter === "true"}
                onClick={() => setRatingFilter("true")}
              >
                True
              </Pill>
              <Pill
                active={ratingFilter === "correct"}
                onClick={() => setRatingFilter("correct")}
              >
                Correct
              </Pill>
            </div>

            <div
              aria-live="polite"
              className="text-sm text-gray-600 mt-2 md:mt-0"
              title="จำนวนที่แสดงผลหลังฟิลเตอร์"
            >
              แสดง {filtered.length} รายการ
              {nextToken ? " (มีข้อมูลเพิ่มเติม…)" : ""}
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-5xl mx-auto px-4 py-6">
        {/* Error */}
        {error && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            ⚠️ เกิดข้อผิดพลาด: {error}
          </div>
        )}

        {/* Empty / Hint */}
        {!loading && items.length === 0 && !error && (
          <div className="rounded-2xl border border-dashed bg-white p-6 text-gray-600">
            เริ่มค้นหาได้เลย — ลองคำกว้าง ๆ เช่น <b>วัคซีน</b> หรือ <b>covid</b>{" "}
            จากนั้นค่อยใช้ฟิลเตอร์ผลตรวจ
          </div>
        )}

        {/* Skeleton */}
        {loading && (
          <ul className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <li
                key={i}
                className="animate-pulse rounded-2xl border bg-white p-5"
              >
                <div className="h-4 w-2/3 bg-gray-200 rounded mb-3" />
                <div className="h-3 w-1/3 bg-gray-200 rounded mb-4" />
                <div className="h-3 w-1/2 bg-gray-200 rounded mb-2" />
                <div className="h-3 w-1/4 bg-gray-200 rounded" />
              </li>
            ))}
          </ul>
        )}

        {/* Results */}
        {!loading && filtered.length > 0 && (
          <ul className="space-y-4">
            {filtered.map((c, idx) => (
              <li
                key={idx}
                className="rounded-2xl border bg-white p-5 shadow-sm hover:shadow transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs text-gray-500">
                      {c.claimDate
                        ? new Date(c.claimDate).toLocaleDateString()
                        : ""}
                    </div>
                    <h2 className="font-semibold text-lg">
                      {c.text || "(ไม่มีข้อความอ้างอิง)"}
                    </h2>
                    <div className="text-sm text-gray-600">
                      ผู้กล่าวอ้าง: {c.claimant || "-"}
                    </div>
                  </div>
                </div>

                {(c.claimReview ?? []).map((r, i) => (
                  <div
                    key={i}
                    className="mt-4 rounded-xl border p-4 bg-gray-50"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div className="text-sm">
                        ผู้ตรวจสอบ:{" "}
                        <b>{r.publisher?.name || r.publisher?.site || "-"}</b>
                      </div>
                      <Badge label={r.textualRating} />
                    </div>

                    {r.title && (
                      <div className="mt-2 text-sm font-medium">{r.title}</div>
                    )}

                    <div className="text-xs text-gray-500 mt-1">
                      วันที่รีวิว:{" "}
                      {r.reviewDate
                        ? new Date(r.reviewDate).toLocaleDateString()
                        : "-"}{" "}
                      · ภาษาบทรีวิว: {r.languageCode || lang}
                    </div>

                    {r.url && (
                      <div className="mt-2">
                        <a
                          className="inline-flex items-center gap-1 text-sm text-blue-700 underline"
                          href={r.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          อ่านต้นฉบับ ↗
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </li>
            ))}
          </ul>
        )}

        {/* Load more */}
        {!loading && !error && items.length > 0 && nextToken && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={onLoadMore}
              disabled={loadingMore}
              className="px-5 py-2 rounded-xl border bg-white hover:bg-gray-50 transition shadow-sm"
            >
              {loadingMore ? "กำลังโหลด..." : "โหลดเพิ่ม"}
            </button>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-4 py-8 text-center text-xs text-gray-500">
        ข้อมูลจากผู้ตรวจสอบข้อเท็จจริง (Fact-Checking Publishers) ผ่าน Google
        Fact Check Tools API
      </footer>
    </main>
  );
}
