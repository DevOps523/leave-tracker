import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.set("etag", false); // disable Express caching via ETag

const PORT = process.env.PORT || 3000;
const AUTH_TOKEN = process.env.AUTH_TOKEN;

// Parse forms and JSON
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// ✅ Helper: token validation
function assertToken(req, res) {
  const token = req.query.token || req.headers["x-auth-token"];
  if (token !== AUTH_TOKEN) {
    res.status(403).send("❌ Forbidden — invalid or missing token");
    return false;
  }
  return true;
}

// ✅ Serve the frontend (root folder)
app.use(express.static(path.join(__dirname, ".."), { cacheControl: false }));

// ✅ Secure admin endpoint for updating deployment URL
app.get("/admin", (req, res) => {
  if (!assertToken(req, res)) return;

  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");

  const versionPath = path.join(__dirname, "deployment.json");
  let current = "(not set)";
  try {
    const data = JSON.parse(fs.readFileSync(versionPath, "utf-8"));
    current = data.deploymentUrl || current;
  } catch (_) {}

  const wasUpdated = req.query.updated === "1";

  res.send(`<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Update Deployment URL</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial,sans-serif;padding:24px;max-width:720px;margin:auto;background:#f8fafc;color:#111}
label{display:block;margin:12px 0 6px;font-weight:600}
input[type=url]{width:100%;padding:10px;border:1px solid #ccc;border-radius:8px;font-size:14px}
button{background:#1c74e9;color:#fff;border:0;border-radius:8px;padding:10px 14px;font-weight:700;cursor:pointer}
button:hover{background:#155ec0}
.card{border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-top:16px;background:white;box-shadow:0 2px 4px rgba(0,0,0,0.05)}
.small{color:#555;font-size:12px}
.success{color:#0a7a2f;margin-bottom:12px}
</style>
</head>
<body>
  <h1>Update Deployment URL</h1>
  ${wasUpdated ? '<p class="success" id="success-msg">✅ Deployment URL updated successfully!</p>' : ''}
  <div class="card">
    <div class="small">Current URL:</div>
    <div style="word-break:break-all;margin-top:4px;">${current}</div>
  </div>

  <form id="update-form" method="post" action="/admin/version?token=${encodeURIComponent(req.query.token)}" class="card">
    <label for="deploymentUrl">New Apps Script Web App URL</label>
    <input required type="url" id="deploymentUrl" name="deploymentUrl"
           placeholder="https://script.google.com/macros/s/…/exec" />
    <div style="margin-top:12px">
      <button type="submit">Save</button>
    </div>
    <p class="small" style="margin-top:8px">This saves to <code>backend/deployment.json</code> immediately. No restart needed.</p>
  </form>

  <script>
  const success = document.getElementById('success-msg');
  if (success) {
    setTimeout(() => {
      success.remove();
      const url = new URL(window.location);
      url.searchParams.delete('updated');
      window.history.replaceState({}, document.title, url.toString());
      document.getElementById('deploymentUrl').value = '';
    }, 3000);
  }
  </script>
</body>
</html>`);
});

// ✅ POST route — save new URL, then redirect back to admin
app.post("/admin/version", (req, res) => {
  if (!assertToken(req, res)) return;

  const url = (req.body.deploymentUrl || "").trim();
  if (!url || !/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(url)) {
    return res.status(400).send("Invalid Apps Script URL. It must look like: https://script.google.com/macros/s/<ID>/exec");
  }

  const versionPath = path.join(__dirname, "deployment.json");
  const payload = JSON.stringify({ deploymentUrl: url }, null, 2);

  try {
    fs.writeFileSync(versionPath, payload, "utf-8");
    res.redirect(303, `/admin?token=${encodeURIComponent(req.query.token)}&updated=1`);
  } catch (err) {
    console.error("Error writing deployment.json:", err);
    res.status(500).send("Failed to write deployment.json");
  }
});

// ✅ Safe endpoint for frontend (no token exposure)
app.get("/api/version", (req, res) => {
  try {
    const versionPath = path.join(__dirname, "deployment.json");
    const data = JSON.parse(fs.readFileSync(versionPath, "utf-8"));

    // 🚫 disable cache so frontend always gets latest version
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.set("Surrogate-Control", "no-store");

    res.json(data);
  } catch (err) {
    console.error("Error reading deployment.json:", err);
    res.status(500).json({ error: "version.json missing" });
  }
});

// ✅ Start server
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));

