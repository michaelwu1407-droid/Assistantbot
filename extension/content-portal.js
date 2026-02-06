/**
 * REA / Domain content script — scrapes listing data from property portals.
 * Injects a "Import to Pj Buddy" button on listing pages.
 */

(function () {
  function detectPortal() {
    if (window.location.hostname.includes("realestate.com.au")) return "rea";
    if (window.location.hostname.includes("domain.com.au")) return "domain";
    return null;
  }

  function scrapeREA() {
    const titleEl = document.querySelector("h1.property-info-address");
    const priceEl = document.querySelector('[data-testid="listing-details__summary-title"]');
    const bedsEl = document.querySelector('[data-testid="property-features-feature-beds"]');
    const bathsEl = document.querySelector('[data-testid="property-features-feature-baths"]');

    return {
      type: "listing",
      source: "rea",
      sourceUrl: window.location.href,
      title: titleEl?.textContent?.trim() ?? document.title,
      price: priceEl?.textContent?.trim() ?? "",
      bedrooms: parseInt(bedsEl?.textContent?.trim() ?? "0") || 0,
      bathrooms: parseInt(bathsEl?.textContent?.trim() ?? "0") || 0,
      address: titleEl?.textContent?.trim() ?? "",
    };
  }

  function scrapeDomain() {
    const titleEl = document.querySelector("h1[data-testid='listing-details__summary-title']");
    const priceEl = document.querySelector("[data-testid='listing-details__summary-title']");
    const featuresEl = document.querySelectorAll("[data-testid='property-features__feature']");

    let bedrooms = 0;
    let bathrooms = 0;
    featuresEl.forEach((el) => {
      const text = el.textContent?.trim() ?? "";
      if (text.includes("Bed")) bedrooms = parseInt(text) || 0;
      if (text.includes("Bath")) bathrooms = parseInt(text) || 0;
    });

    return {
      type: "listing",
      source: "domain",
      sourceUrl: window.location.href,
      title: titleEl?.textContent?.trim() ?? document.title,
      price: priceEl?.textContent?.trim() ?? "",
      bedrooms,
      bathrooms,
      address: titleEl?.textContent?.trim() ?? "",
    };
  }

  function injectButton() {
    // Don't inject twice
    if (document.getElementById("pjbuddy-import-btn")) return;

    const btn = document.createElement("button");
    btn.id = "pjbuddy-import-btn";
    btn.textContent = "Import to Pj Buddy";
    btn.style.cssText =
      "position:fixed;bottom:20px;right:20px;z-index:99999;padding:12px 24px;background:#6366f1;color:white;border:none;border-radius:24px;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.15);";

    btn.addEventListener("click", () => {
      btn.textContent = "Importing...";
      btn.disabled = true;

      const portal = detectPortal();
      const data = portal === "rea" ? scrapeREA() : scrapeDomain();

      chrome.runtime.sendMessage(
        { type: "PUSH_TO_CRM", data },
        (response) => {
          if (response?.success) {
            btn.textContent = "Imported!";
            btn.style.background = "#16a34a";
          } else {
            btn.textContent = "Error";
            btn.style.background = "#dc2626";
            console.error("Pj Buddy:", response?.error);
          }

          setTimeout(() => {
            btn.textContent = "Import to Pj Buddy";
            btn.style.background = "#6366f1";
            btn.disabled = false;
          }, 3000);
        }
      );
    });

    document.body.appendChild(btn);
  }

  // Wait a bit for SPA to render
  setTimeout(injectButton, 2000);
})();
