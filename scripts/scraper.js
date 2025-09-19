import fs from "fs";
import puppeteer from "puppeteer";

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"] // 👈 fix for GitHub Actions
    });

    const page = await browser.newPage();

    // Go to CSSBattle homepage
    await page.goto("https://cssbattle.dev/", { waitUntil: "networkidle2" });

    // 🔎 Find the "openTopSolutions" link
    const topSolutionsLink = await page.$eval(
      'a[href*="openTopSolutions"]',
      el => el.href
    ).catch(() => null);

    if (!topSolutionsLink) {
      throw new Error("❌ No link found for top solutions!");
    }

    // Navigate to the solutions page
    await page.goto(topSolutionsLink, { waitUntil: "networkidle2" });
    await page.waitForTimeout(1000);

    // ⚠️ Adjust selectors based on actual DOM structure
    const codes = await page.$$eval(".submissions-list__code", els =>
      els.map(el => el.innerText).slice(0, 10)
    );

    const colors = await page.$$eval(".colors-list__color", els =>
      els.map(el => el.innerText.trim() || getComputedStyle(el).backgroundColor)
    );

    // Yesterday's date for filename
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yesterDay = d.toISOString().split("T")[0];
    const filename = `solutions-${yesterDay}.json`;

    // Ensure data directory exists
    if (!fs.existsSync("data")) fs.mkdirSync("data");

    // Save scraped codes
    const jsonData = { codes };
    fs.writeFileSync(`data/${filename}`, JSON.stringify(jsonData, null, 2));

    // Update metadata
    const metaPath = "data/targets-metadata.json";
    let metadata = [];
    if (fs.existsSync(metaPath)) {
      metadata = JSON.parse(fs.readFileSync(metaPath, "utf8"));
    }
    if (!metadata.some(item => item.date === yesterDay)) {
      metadata.push({
        date: yesterDay,
        colors: colors.slice(0, 3),
        file: filename
      });
      fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));
    }

    console.log("✅ Scraping completed:", filename);

  } catch (err) {
    console.error("🚨 Error during scraping:", err.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();
