import { chromium, type Browser } from "playwright";

/**
 * Brain.com.ua і Rozetka повертають HTTP 403 навіть із браузерним
 * User-Agent при простому fetch — схоже на повноцінний WAF/anti-bot, що
 * перевіряє більше, ніж заголовки (TLS-відбиток, JS-виконання тощо). Замість
 * простого HTTP-запиту рендеримо сторінку в headless Chromium — це ближче
 * до поведінки реального браузера і в багатьох випадках достатньо, щоб
 * пройти захист середнього рівня (на відміну від Cloudflare Enterprise
 * bot-менеджменту, де знадобилися б додаткові stealth-хитрощі).
 *
 * Один запуск браузера на весь виклик було б швидше, але й крихкіше при
 * помилках однієї сторінки — тут кожен виклик самостійний і завжди
 * закриває браузер, ціна — трохи повільніший скрапінг (прийнятно для
 * щоденного крону).
 */
export async function browserFetchHtml(url: string): Promise<string | null> {
  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--disable-blink-features=AutomationControlled"],
    });
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      locale: "uk-UA",
      viewport: { width: 1366, height: 900 },
    });
    await context.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    });

    const page = await context.newPage();
    const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    if (res && res.status() >= 400) {
      console.warn(`[browserFetchHtml] ${url} -> HTTP ${res.status()}`);
      return null;
    }
    // Дати шанс JS-рендерингу/анти-бот перевіркам відпрацювати.
    await page.waitForTimeout(3000);
    return await page.content();
  } catch (err) {
    console.warn(`[browserFetchHtml] ${url} failed:`, (err as Error).message);
    return null;
  } finally {
    await browser?.close();
  }
}
