if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").then(r =>
    console.log("SW registered:", r.scope)
  );
}

const LS_KEY = "__v"; // version cache key
const VERSION_URL = "/api/version"; // secure API endpoint

function createUpdateToast(onConfirm) {
  const existing = document.querySelector(".update-toast");
  if (existing) return;

  const toast = document.createElement("div");
  toast.className = "update-toast";
  toast.innerHTML = `<span>🔄 New version available</span><button>Update</button>`;

  toast.querySelector("button").onclick = () => { onConfirm?.(); toast.remove(); };

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 15000); // optional auto-hide
}



async function fetchVersion() {
  const res = await fetch(VERSION_URL, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch version.json");
  return res.json();
}

async function clearCaches() {
  if (!("caches" in window)) return;
  const keys = await caches.keys();
  await Promise.all(keys.map(k => caches.delete(k)));
}

function sendMessageToSW(msg) {
  if (navigator.serviceWorker.controller)
    navigator.serviceWorker.controller.postMessage(msg);
}

async function applyUpdate(newUrl) {
  sendMessageToSW({ type: "SKIP_WAITING" });
  await new Promise(r => setTimeout(r, 500));
  sendMessageToSW({ type: "CLEAR_CACHES" });
  await clearCaches();
  localStorage.setItem(LS_KEY, newUrl);
  location.reload();
}

async function checkVersionOnce() {
  try {
    const { deploymentUrl } = await fetchVersion();
    const current = localStorage.getItem(LS_KEY);

    if (!current) {
      localStorage.setItem(LS_KEY, deploymentUrl);
      return;
    }

    if (deploymentUrl && deploymentUrl !== current) {
      console.log("🔄 New version detected:", deploymentUrl);
      createUpdateToast(() => applyUpdate(deploymentUrl));
    }
  } catch (e) {
    console.debug("Version check error:", e.message);
  }
}

// Run check once and every minute
checkVersionOnce();
setInterval(checkVersionOnce, 60 * 1000);
