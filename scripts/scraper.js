import fs from "fs";
import puppeteer from "puppeteer";

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  // Navigate to CSSBattle (⚠️ adjust to the actual leaderboard URL)
  await page.goto("https://cssbattle.dev/", { waitUntil: "networkidle2" });

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

  await browser.close();
})();
