const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const HTML_PATH = 'file:///Users/summer/WorkBuddy/2026-06-27-11-18-55/ppt/index.html';
const OUTPUT_DIR = '/Users/summer/WorkBuddy/2026-06-27-11-18-55/ppt/screenshots';
const NUM_SLIDES = 8;

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--force-color-profile=srgb', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 });

  console.log('Loading page...');
  await page.goto(HTML_PATH, { waitUntil: 'networkidle0', timeout: 30000 });

  // Wait for fonts and WebGL to fully load
  console.log('Waiting for fonts and WebGL...');
  await page.evaluate(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 4000));

  const slideCount = await page.evaluate(() => {
    return document.querySelectorAll('section.slide').length;
  });
  console.log(`Found ${slideCount} slides`);

  for (let i = 0; i < slideCount; i++) {
    console.log(`Capturing slide ${i + 1}...`);

    // Hide all slides except the current one, force animations visible
    await page.evaluate((idx) => {
      const slides = document.querySelectorAll('section.slide');
      slides.forEach((s, si) => {
        if (si === idx) {
          s.style.display = 'flex';
          s.style.position = 'fixed';
          s.style.top = '0';
          s.style.left = '0';
          s.style.width = '100vw';
          s.style.height = '100vh';
          s.style.zIndex = '9999';
        } else {
          s.style.display = 'none';
        }
      });
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';

      // Force ALL animated elements visible (Motion One sets opacity:0 initially)
      document.querySelectorAll('[data-anim]').forEach(el => {
        el.style.opacity = '1';
        el.style.transform = 'none';
        el.style.transition = 'none';
        el.style.animation = 'none';
        // Remove any inline transform/opacity that Motion One may have set
      });

      // Also ensure stat-card, h-xl, grid elements are visible
      document.querySelectorAll('.stat-card, .h-xl, .kicker, .body-zh, .callout, .phone-slot, .lead, .display-zh, .stat-nb, .stat-note, .stat-label, .stat-unit').forEach(el => {
        if (el.style.opacity === '0' || !el.style.opacity) {
          el.style.opacity = '1';
        }
        if (!el.style.visibility || el.style.visibility === 'hidden') {
          el.style.visibility = 'visible';
        }
      });
    }, i);

    // Wait for reflow
    await new Promise(r => setTimeout(r, 2000));

    const outputPath = path.join(OUTPUT_DIR, `slide_${i + 1}.png`);
    await page.screenshot({
      path: outputPath,
      type: 'png',
      clip: { x: 0, y: 0, width: 1920, height: 1080 }
    });
    console.log(`  Saved: ${outputPath}`);
  }

  await browser.close();
  console.log('Done! All slides captured.');
})();
