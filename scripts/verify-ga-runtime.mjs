const GA_ID = "G-FL6RVZW90M";
const REQUIRED_MARKERS = [`googletagmanager.com/gtag/js?id=${GA_ID}`, 'id="ga-init"'];
const URLS = ["https://www.opturon.com/", "https://www.opturon.com/app"];

async function verifyUrl(url) {
  const response = await fetch(url, { redirect: "follow" });
  const html = await response.text();
  const missing = REQUIRED_MARKERS.filter((marker) => !html.includes(marker));

  if (missing.length > 0) {
    throw new Error(`${url} is missing markers: ${missing.join(", ")}`);
  }

  console.log(`[verify:ga] OK ${url}`);
}

async function main() {
  let hasError = false;

  for (const url of URLS) {
    try {
      await verifyUrl(url);
    } catch (error) {
      hasError = true;
      console.error(`[verify:ga] ERROR ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (hasError) process.exit(1);

  console.log("[verify:ga] GA snippet present on all checked routes.");
}

main().catch((error) => {
  console.error(`[verify:ga] FATAL ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
