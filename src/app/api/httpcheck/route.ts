import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const urlToCheck = (searchParams.get("url") || "").trim();
  const apiKey = process.env.SAFE_BROWSING_API_KEY;

  if (!urlToCheck) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }
  if (!apiKey) {
    return NextResponse.json({ error: "Missing SAFE_BROWSING_API_KEY" }, { status: 500 });
  }

  // payload ตาม spec ของ threatMatches.find
  const payload = {
    client: { clientId: "factcheck-web", clientVersion: "1.0.0" },
    threatInfo: {
      threatTypes: [
        "MALWARE",
        "SOCIAL_ENGINEERING",
        "UNWANTED_SOFTWARE",
        "POTENTIALLY_HARMFUL_APPLICATION",
      ],
      platformTypes: ["ANY_PLATFORM"],
      threatEntryTypes: ["URL"],
      threatEntries: [{ url: urlToCheck }],
    },
  };

  const resp = await fetch(
    `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    }
  );

  const text = await resp.text();
  try {
    const json = JSON.parse(text || "{}");
    // ปกติถ้า “ปลอดภัย” จะได้ {} (ไม่มี matches)
    return NextResponse.json(json, { status: resp.status });
  } catch {
    // กันเคสแปลก ๆ ที่ไม่ใช่ JSON
    return NextResponse.json({ error: text }, { status: resp.status });
  }
}
