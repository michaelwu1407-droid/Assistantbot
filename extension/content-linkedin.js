/**
 * LinkedIn content script — scrapes profile data from LinkedIn pages.
 * Injects a "Save to Pj Buddy" button on LinkedIn profile pages.
 */

(function () {
  // Only run on profile pages
  if (!window.location.pathname.startsWith("/in/")) return;

  // Wait for page to fully load
  function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve) => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);

      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  }

  async function scrapeProfile() {
    const nameEl = document.querySelector("h1.text-heading-xlarge");
    const headlineEl = document.querySelector(".text-body-medium");
    const locationEl = document.querySelector(".text-body-small.inline");

    const name = nameEl?.textContent?.trim() ?? "";
    const headline = headlineEl?.textContent?.trim() ?? "";
    const location = locationEl?.textContent?.trim() ?? "";

    // Try to get company from experience section
    const companyEl = document.querySelector(
      '[data-field="experience_company_logo"] span'
    );
    const company = companyEl?.textContent?.trim() ?? "";

    return {
      type: "contact",
      source: "linkedin",
      sourceUrl: window.location.href,
      name,
      company: company || headline.split(" at ").pop() || "",
      title: headline,
      location,
    };
  }

  async function injectButton() {
    const actionsBar = await waitForElement(".pvs-profile-actions");
    if (!actionsBar) return;

    // Don't inject twice
    if (document.getElementById("pjbuddy-save-btn")) return;

    const btn = document.createElement("button");
    btn.id = "pjbuddy-save-btn";
    btn.textContent = "Save to Pj Buddy";
    btn.style.cssText =
      "margin-left:8px;padding:6px 16px;background:#6366f1;color:white;border:none;border-radius:16px;font-size:14px;font-weight:600;cursor:pointer;";

    btn.addEventListener("click", async () => {
      btn.textContent = "Saving...";
      btn.disabled = true;

      const data = await scrapeProfile();

      chrome.runtime.sendMessage(
        { type: "PUSH_TO_CRM", data },
        (response) => {
          if (response?.success) {
            btn.textContent = "Saved!";
            btn.style.background = "#16a34a";
          } else {
            btn.textContent = "Error";
            btn.style.background = "#dc2626";
            console.error("Pj Buddy:", response?.error);
          }

          setTimeout(() => {
            btn.textContent = "Save to Pj Buddy";
            btn.style.background = "#6366f1";
            btn.disabled = false;
          }, 3000);
        }
      );
    });

    actionsBar.appendChild(btn);
  }

  injectButton();
})();
