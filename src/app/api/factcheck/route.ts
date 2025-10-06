import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("query") || searchParams.get("q");
  const lang = searchParams.get("lang") || "th";
  const pageSize = searchParams.get("pageSize") || "10";
  const pageToken = searchParams.get("pageToken") || "";
  const apiKey = process.env.FACTCHECK_API_KEY;

  if (!q) return NextResponse.json({ error: "Missing query" }, { status: 400 });
  if (!apiKey) return NextResponse.json({ error: "Missing FACTCHECK_API_KEY" }, { status: 500 });

  const url = new URL("https://factchecktools.googleapis.com/v1alpha1/claims:search");
  url.searchParams.set("query", q);
  url.searchParams.set("languageCode", lang);
  url.searchParams.set("pageSize", pageSize);
  if (pageToken) url.searchParams.set("pageToken", pageToken);
  url.searchParams.set("key", apiKey);

  const r = await fetch(url.toString(), {
    // ใส่ referrer ถ้าคีย์ถูก Restrict เป็น HTTP referrers
    headers: { referer: "http://localhost:3000/" },
    cache: "no-store",
  });

  const text = await r.text();
  try {
    const json = JSON.parse(text);
    return NextResponse.json(json, { status: r.status });
  } catch {
    return NextResponse.json({ error: text }, { status: r.status });
  }
}
