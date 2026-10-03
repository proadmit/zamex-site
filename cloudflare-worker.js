/**
 * Zamex form → Telegram relay (Cloudflare Worker)
 *
 * Also answers GET /geo with the visitor's country, used to pick the site language.
 *
 * Receives a form submission (from a Framer form webhook, or any POST)
 * and posts it as a neat message to your Telegram group via your bot.
 * The bot token never appears in the website's code.
 *
 * Set these in Cloudflare → Worker → Settings → Variables and Secrets:
 *   BOT_TOKEN   (Secret)  — from @BotFather, e.g. 123456:ABC-...
 *   CHAT_ID     (Text)    — the group's chat id, e.g. -1001234567890
 *   FORM_KEY    (Secret)  — any long random string; must match ?key= in the webhook URL
 *   ALLOWED_ORIGINS (Text) — your website address(es), comma-separated, e.g.
 *                 https://zamex.vercel.app,https://zamex.tj
 *                 Forms on these sites can send without the ?key= password.
 *   THREAD_ID   (Text, optional) — topic id if your group uses Topics
 */

const LABELS = {
  form: "Form",
  name: "Name",
  company: "Company",
  email: "Email",
  contact: "Telegram / phone",
  location: "Location",
  country: "Country of registration",
  side: "Direction",
  asset: "Asset",
  amount: "Approx. amount",
  currency: "Settlement currency",
  message: "Message",
  comments: "Comments",
  consent: "KYB consent",
  page: "Sent from",
};

const escapeHtml = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function readBody(request) {
  const type = request.headers.get("content-type") || "";
  if (type.includes("application/json")) return await request.json();
  if (type.includes("form")) return Object.fromEntries(await request.formData());
  const text = await request.text();
  try { return JSON.parse(text); } catch { return Object.fromEntries(new URLSearchParams(text)); }
}

function buildMessage(data) {
  const isQuote = Boolean(data.asset || data.amount || data.company);
  const title = isQuote ? "💱 <b>New OTC quote request</b>" : "✉️ <b>New contact message</b>";
  const lines = [title, ""];
  for (const [key, raw] of Object.entries(data)) {
    if (raw === undefined || raw === null || String(raw).trim() === "") continue;
    if (key === "key" || key === "website") continue; // secret / honeypot
    const label = LABELS[key.toLowerCase()] || key;
    const value = String(raw).slice(0, 1500);
    lines.push(`<b>${escapeHtml(label)}:</b> ${escapeHtml(value)}`);
  }
  lines.push("", `<i>${new Date().toISOString().replace("T", " ").slice(0, 16)} UTC</i>`);
  return lines.join("\n").slice(0, 4000);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((o) => o.trim().replace(/\/$/, "")).filter(Boolean);
    const originOk = origin !== "" && allowed.includes(origin);
    const cors = {
      "Access-Control-Allow-Origin": originOk ? origin : "*",
      "Vary": "Origin",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });

    // Visitor's country for automatic website language (Cloudflare knows it from the IP).
    if (request.method === "GET" && new URL(request.url).pathname === "/geo") {
      const country = (request.cf && request.cf.country) || "";
      return new Response(JSON.stringify({ country }), {
        headers: { ...cors, "Access-Control-Allow-Origin": "*", "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors });

    const url = new URL(request.url);
    const keyOk = Boolean(env.FORM_KEY) && url.searchParams.get("key") === env.FORM_KEY;
    if (!keyOk && !originOk) {
      return new Response("Forbidden", { status: 403, headers: cors });
    }

    let data;
    try { data = await readBody(request); } catch { return new Response("Bad request", { status: 400, headers: cors }); }
    if (!data || typeof data !== "object") return new Response("Bad request", { status: 400, headers: cors });

    // Honeypot: bots fill hidden fields named "website"; humans never see it.
    if (data.website) return new Response("OK", { status: 200, headers: cors });

    const payload = {
      chat_id: env.CHAT_ID,
      text: buildMessage(data),
      parse_mode: "HTML",
      disable_web_page_preview: true,
    };
    if (env.THREAD_ID) payload.message_thread_id = Number(env.THREAD_ID);

    const tg = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!tg.ok) {
      const detail = await tg.text();
      console.log("Telegram error", tg.status, detail);
      return new Response("Could not deliver", { status: 502, headers: cors });
    }
    return new Response("OK", { status: 200, headers: cors });
  },
};
