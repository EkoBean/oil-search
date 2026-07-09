export async function notifyAdmin(message) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("[notify] DISCORD_WEBHOOK_URL 未設定，僅印出通知內容:", message);
    return;
  }

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: message }),
  });

  if (!res.ok) {
    console.error("[notify] Discord webhook 送出失敗:", res.status, await res.text());
  }
}
