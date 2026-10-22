/* DCYM Bokaro admin website.
   Staff sign in here to edit the website's text, carousel photos, albums (many photos at once), events and more.
   Data lives in your Supabase project (see backend/setup.sql and README.md). */
const C = window.ADMIN_CONFIG || {};
const base = (C.supabaseUrl || "").replace(/\/rest\/v1\/?$/, "").replace(/\/$/, ""), KEY = C.supabaseKey || "";
const BUCKET = "church-media";
const DEFAULT = window.DCYM_DEFAULT;
const $ = s => document.querySelector(s);
const h = (t, a = {}, ...k) => { const e = document.createElement(t); for (const [x, v] of Object.entries(a)) { if (x === "class") e.className = v; else if (x.startsWith("on")) e[x] = v; else e.setAttribute(x, v); } k.flat().forEach(c => e.append(c && c.nodeType ? c : document.createTextNode(c == null ? "" : c))); return e; };
const app = $("#app");
let session = null, D = null, dirtyFlag = false, active = "Details", uid = 0;
try { session = JSON.parse(localStorage.getItem("dcym-church-admin") || "null"); } catch (e) { }

/* ---------- Supabase REST helpers ---------- */
const jsonH = { apikey: KEY, "Content-Type": "application/json" };
function setSession(j, prev) { session = { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Date.now() + (j.expires_in || 3600) * 1000 - 60000, email: (j.user && j.user.email) || (prev && prev.email) || "" }; try { localStorage.setItem("dcym-church-admin", JSON.stringify(session)); } catch (e) { } }
function logout() { session = null; try { localStorage.removeItem("dcym-church-admin"); } catch (e) { } start(); }
async function login(email, password) {
  let r, j = {};
  try { r = await fetch(base + "/auth/v1/token?grant_type=password", { method: "POST", headers: jsonH, body: JSON.stringify({ email, password }) }); j = await r.json().catch(() => ({})); }
  catch (e) { throw new Error("Could not reach Supabase. Check your internet connection and the project URL in admin/config.js."); }
  if (!r.ok) {
    const m = j.error_description || j.msg || j.message || "";
    throw new Error(/invalid api key|apikey|no api key/i.test(m) ? "The Supabase key in admin/config.js is wrong or missing (use the anon public key from Project Settings > API)."
      : /not confirmed/i.test(m) ? "This email is not confirmed yet. In Supabase open Authentication > Users and confirm it."
        : /invalid login/i.test(m) || !m ? "Wrong email or password. If you are sure they are right, the user may have been created in a different Supabase project."
          : m);
  }
  setSession(j);
}
async function ensure() {
  if (!session) throw new Error("Please sign in.");
  if (Date.now() > session.expires_at) {
    const r = await fetch(base + "/auth/v1/token?grant_type=refresh_token", { method: "POST", headers: jsonH, body: JSON.stringify({ refresh_token: session.refresh_token }) });
    if (!r.ok) { logout(); throw new Error("Your session expired. Please sign in again."); }
    setSession(await r.json(), session);
  }
}
const authH = () => ({ apikey: KEY, Authorization: "Bearer " + session.access_token, "Content-Type": "application/json" });
async function loadData() {
  const r = await fetch(base + "/rest/v1/site_content?id=eq.1&select=data", { headers: { apikey: KEY, Authorization: "Bearer " + KEY } });
  if (!r.ok) throw new Error("Could not load the site content. Did you run backend/setup.sql in the Supabase SQL Editor?");
  const rows = await r.json(); return rows[0] && rows[0].data && Object.keys(rows[0].data).length ? rows[0].data : {};
}
async function saveData(data) {
  await ensure();
  const r = await fetch(base + "/rest/v1/site_content", { method: "POST", headers: Object.assign(authH(), { Prefer: "resolution=merge-duplicates,return=minimal" }), body: JSON.stringify({ id: 1, data, updated_at: new Date().toISOString() }) });
  if (!r.ok) throw new Error("Could not save. Make sure this account was created in your Supabase project and setup.sql was run.");
}
async function shrink(file, max = 1800) {
  const bmp = await createImageBitmap(file), k = Math.min(1, max / Math.max(bmp.width, bmp.height)), c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k); c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise(r => c.toBlob(r, "image/jpeg", .86));
}
async function upload(file) {
  await ensure();
  const blob = await shrink(file), name = Date.now() + "-" + Math.random().toString(36).slice(2, 8) + ".jpg";
  const r = await fetch(base + "/storage/v1/object/" + BUCKET + "/" + name, { method: "POST", headers: { apikey: KEY, Authorization: "Bearer " + session.access_token, "Content-Type": "image/jpeg" }, body: blob });
  if (!r.ok) throw new Error("Upload failed. Did you run backend/setup.sql (it creates the photo storage)?");
  return base + "/storage/v1/object/public/" + BUCKET + "/" + name;
}
/* upload many files one after another; onEach(url, i) fires as each one finishes */
async function uploadMany(files, st, onEach) {
  const imgs = [...files].filter(f => /^image\//.test(f.type) || /\.(jpe?g|png|webp|gif|heic)$/i.test(f.name));
  let ok = 0, fail = 0;
  for (let i = 0; i < imgs.length; i++) {
    st.textContent = `Uploading ${i + 1} of ${imgs.length}…`;
    try { onEach(await upload(imgs[i]), i); ok++; } catch (e) { fail++; if (/sign in|expired/i.test(e.message)) break; }
  }
  st.textContent = !imgs.length ? "Please choose image files." : `${ok} photo${ok === 1 ? "" : "s"} added${fail ? `, ${fail} failed (try again)` : ""}. Remember to press Save changes.`;
  return ok;
}

/* ---------- editor building blocks ---------- */
const status = h("span", { class: "ast", role: "status" });
const dirty = () => { dirtyFlag = true; status.textContent = "Unsaved changes"; };
addEventListener("beforeunload", e => { if (dirtyFlag) { e.preventDefault(); e.returnValue = ""; } });
function field(label, obj, key, o = {}) {
  const id = "af" + (uid++), i = o.rows ? h("textarea", { id, rows: o.rows, placeholder: o.ph || "" }) : h("input", { id, type: o.type || "text", placeholder: o.ph || "" });
  i.value = obj[key] || ""; i.oninput = () => { obj[key] = i.value; dirty(); };
  return h("div", { class: "af" }, h("label", { for: id }, label), i);
}
function photo(label, obj, key) {
  const prev = h("img", { class: "ap", alt: "" }), st = h("span", { class: "ast" }), file = h("input", { type: "file", accept: "image/*", hidden: "" });
  const upd = () => { prev.hidden = !obj[key]; prev.src = obj[key] || ""; };
  file.onchange = async () => { const f = file.files[0]; if (!f) return; st.textContent = "Uploading…"; try { obj[key] = await upload(f); upd(); dirty(); st.textContent = "Photo added"; } catch (e) { st.textContent = e.message; } file.value = ""; };
  upd();
  return h("div", { class: "af" }, h("label", {}, label), prev, h("div", { class: "arow" }, h("button", { type: "button", class: "ab", onclick: () => file.click() }, "Take or choose photo"), h("button", { type: "button", class: "ab ghost", onclick: () => { obj[key] = ""; upd(); dirty(); } }, "Remove photo"), st), file);
}
function del(arr, i, draw) {
  const b = h("button", { type: "button", class: "ab danger" }, "Delete"); let armed = 0;
  b.onclick = () => { if (!armed) { armed = 1; b.textContent = "Tap again to delete"; setTimeout(() => { armed = 0; b.textContent = "Delete"; }, 3000); return; } arr.splice(i, 1); dirty(); draw(); };
  return b;
}
function list(arr, mk, label, fields, addText = "+ Add") {
  const box = h("div");
  const draw = () => {
    box.replaceChildren(...arr.map((it, i) => h("details", { class: "ai" }, h("summary", {}, label(it) || "Item " + (i + 1)), ...fields(it),
      h("div", { class: "arow" }, h("button", { type: "button", class: "ab ghost", onclick: () => { if (i > 0) { [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; dirty(); draw(); } } }, "Move up"), del(arr, i, draw)))),
      h("button", { type: "button", class: "ab add", onclick: () => { arr.push(mk()); dirty(); draw(); box.lastElementChild.previousElementSibling && (box.lastElementChild.previousElementSibling.open = true); } }, addText));
  };
  draw(); return box;
}
/* drop zone + "choose many" button that feeds uploadMany */
function picker(text, onEach, onDone) {
  const st = h("p", { class: "ast" }), file = h("input", { type: "file", accept: "image/*", multiple: "", hidden: "" });
  const dz = h("div", { class: "dz", tabindex: "0", role: "button" }, h("b", {}, text), h("span", { class: "ast" }, "Tap to choose many photos at once, or drop them here"));
  const go = async files => { dz.style.pointerEvents = "none"; const n = await uploadMany(files, st, onEach); dz.style.pointerEvents = ""; if (n) { dirty(); onDone && onDone(); } };
  dz.onclick = () => file.click(); dz.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); file.click(); } };
  file.onchange = () => { go(file.files); file.value = ""; };
  dz.ondragover = e => { e.preventDefault(); dz.classList.add("over"); }; dz.ondragleave = () => dz.classList.remove("over");
  dz.ondrop = e => { e.preventDefault(); dz.classList.remove("over"); go(e.dataTransfer.files); };
  return h("div", {}, dz, st, file);
}
/* the photo grid inside one album */
function albumPhotos(a) {
  const grid = h("div", { class: "pgrid" }), cnt = h("p", { class: "ast" });
  const draw = () => {
    cnt.textContent = a.photos.length ? `${a.photos.length} photo${a.photos.length === 1 ? "" : "s"} in this album. The first one is the cover.` : "No photos yet.";
    grid.replaceChildren(...a.photos.map((u, i) => h("figure", { class: "pt" }, h("img", { src: u, alt: "", loading: "lazy" }),
      h("div", { class: "pt-b" }, i ? h("button", { type: "button", title: "Make this the cover", onclick: () => { a.photos.unshift(a.photos.splice(i, 1)[0]); dirty(); draw(); } }, "Cover") : h("span", {}, "Cover"),
        h("button", { type: "button", class: "x", title: "Remove photo", onclick: () => { a.photos.splice(i, 1); dirty(); draw(); } }, "✕")))));
  };
  draw();
  return h("div", {}, picker("Add photos to this album", u => a.photos.push(u), draw), cnt, grid);
}
const openIf = (c, el) => { if (c) el.open = true; return el; };
function albums() {
  const box = h("div");
  const draw = () => {
    box.replaceChildren(
      h("p", {}, "Make an album, then add as many photos as you like in one go. Visitors open an album to flip through all its photos."),
      ...D.albums.map((a, i) => openIf(a._open, h("details", { class: "ai" },
        h("summary", {}, (a.title || "Untitled album") + " (" + a.photos.length + ")"),
        field("Album title", a, "title", { ph: "Christmas 2025" }), field("Date (optional)", a, "date", { type: "date" }), field("Short description (optional)", a, "desc", { rows: 2 }),
        albumPhotos(a),
        h("div", { class: "arow" }, h("button", { type: "button", class: "ab ghost", onclick: () => { if (i > 0) { [D.albums[i - 1], D.albums[i]] = [D.albums[i], D.albums[i - 1]]; dirty(); draw(); } } }, "Move up"), del(D.albums, i, draw))))),
      h("button", { type: "button", class: "ab add", onclick: () => { D.albums.unshift({ title: "", date: "", desc: "", photos: [], _open: 1 }); dirty(); draw(); } }, "+ New album"));
  };
  draw(); return [box];
}
function slidesEditor() {
  const box = h("div");
  const draw = () => {
    box.replaceChildren(
      h("p", {}, "These photos scroll in the \"Moments\" carousel on the home page. Add many at once, then give each one a caption."),
      picker("Add photos to the carousel", u => D.slides.push({ photo: u, caption: "" }), draw),
      list(D.slides, () => ({ photo: "", caption: "" }), s => s.caption || (s.photo ? "Photo" : "Empty slide"), s => [photo("Photo", s, "photo"), field("Caption (optional)", s, "caption")], "+ Add one slide"));
  };
  draw(); return [box];
}
function messagesTab() {
  const box = h("div", {}, h("p", { class: "ast" }, "Loading messages…"));
  (async () => {
    try {
      await ensure();
      const r = await fetch(base + "/rest/v1/messages?select=*&order=created_at.desc&limit=100", { headers: authH() });
      if (!r.ok) throw 0; const rows = await r.json();
      box.replaceChildren(rows.length ? h("div", {}, ...rows.map(m => { const d = h("div", { class: "msg" }, h("b", {}, m.name), h("small", {}, m.email + " · " + new Date(m.created_at).toLocaleString()), h("p", {}, m.message)); d.append(h("div", { class: "arow" }, h("a", { class: "ab ghost", href: "mailto:" + m.email }, "Reply"), delMsg(m, d))); return d; })) : h("p", {}, "No messages yet. Messages sent from the website contact form appear here."));
    } catch (e) { box.replaceChildren(h("p", { class: "ast" }, "Could not load messages. Run backend/setup.sql in Supabase (it creates the messages table).")); }
  })();
  return [box];
}
function delMsg(m, el) {
  const b = h("button", { type: "button", class: "ab danger" }, "Delete"); let armed = 0;
  b.onclick = async () => { if (!armed) { armed = 1; b.textContent = "Tap again to delete"; setTimeout(() => { armed = 0; b.textContent = "Delete"; }, 3000); return; } try { await ensure(); await fetch(base + "/rest/v1/messages?id=eq." + m.id, { method: "DELETE", headers: authH() }); el.remove(); } catch (e) { } };
  return b;
}

const tabs = {
  Details: () => [
    h("h3", {}, "Home page"), field("Small line above the title", D.hero, "eyebrow"), field("Title", D.hero, "title", { rows: 2 }), field("Intro text", D.hero, "text", { rows: 3 }),
    h("h3", {}, "Featured verse"), field("Reference (for example Isaiah 40:30–31 (KJV))", D.verse, "ref"), field("Verse text", D.verse, "text", { rows: 5 }),
    h("h3", {}, "About us"), field("Who we are", D.about, "who", { rows: 3 }), field("Our mission", D.about, "mission", { rows: 3 }), field("Our vision", D.about, "vision", { rows: 3 }), field("Our values", D.about, "values", { rows: 2 }),
    h("h3", {}, "Contact and map"), field("Email", D.contact, "email", { type: "email" }), field("Phone", D.contact, "phone", { type: "tel" }), field("WhatsApp number with country code", D.contact, "whatsapp", { type: "tel", ph: "919876543210" }), field("Address", D.contact, "address", { rows: 3 }),
    field("Google Maps embed code or link", D.contact, "map", { rows: 4, ph: "Google Maps > Share > Embed a map > Copy HTML, then paste it here. If empty, the address is used." }),
    h("h3", {}, "Social media links (full web addresses)"), ...["Facebook", "Instagram", "YouTube"].map(k => field(k, D.contact.social, k, { type: "url", ph: "https://" }))],
  Moments: slidesEditor,
  Albums: albums,
  Events: () => [list(D.events, () => ({ title: "", date: "", time: "", venue: "", desc: "", reg: "", photo: "" }), e => (e.title || "") + (e.date ? " (" + e.date + ")" : ""), e => [field("Title", e, "title"), field("Date", e, "date", { type: "date" }), field("Time", e, "time", { ph: "5:00 PM" }), field("Venue", e, "venue"), field("Description", e, "desc", { rows: 3 }), field("Registration link (optional)", e, "reg", { type: "url", ph: "https://" }), photo("Event photo (optional)", e, "photo")])],
  Leaders: () => [list(D.leaders, () => ({ role: "", name: "", desc: "", photo: "" }), l => l.name || l.role, l => [field("Role", l, "role"), field("Name", l, "name"), field("Short description", l, "desc", { rows: 2 }), photo("Photo", l, "photo")])],
  Activities: () => [list(D.activities, () => ({ title: "", desc: "" }), a => a.title, a => [field("Title", a, "title"), field("Description", a, "desc", { rows: 2 })])],
  Notices: () => [list(D.notices, () => ({ title: "", date: "", summary: "", body: "" }), n => n.title, n => [field("Title", n, "title"), field("Date", n, "date", { type: "date" }), field("Short summary", n, "summary", { rows: 2 }), field("Full notice", n, "body", { rows: 5 })])],
  Messages: messagesTab
};
async function save(btn) {
  btn.disabled = true; status.textContent = "Saving…";
  try {
    D.saved = true;
    const copy = JSON.parse(JSON.stringify(D)); copy.albums.forEach(a => delete a._open);
    await saveData(copy); dirtyFlag = false; status.textContent = "Saved. The website will show this within a minute.";
  } catch (e) { status.textContent = e.message || "Could not save."; }
  btn.disabled = false;
}

/* ---------- screens ---------- */
function merge(stored) {
  stored = stored || {};
  const d = Object.assign(JSON.parse(JSON.stringify(DEFAULT)), stored);
  for (const k of ["hero", "about", "verse", "contact"]) d[k] = Object.assign({}, DEFAULT[k], stored[k] || {});
  d.contact.social = Object.assign({ Facebook: "", Instagram: "", YouTube: "" }, (stored.contact || {}).social || {});
  for (const k of ["slides", "albums", "leaders", "activities", "events", "notices"]) if (!Array.isArray(d[k])) d[k] = [];
  d.albums = d.albums.map(a => Object.assign({ title: "", date: "", desc: "" }, a, { photos: (a.photos || []).map(p => typeof p === "string" ? p : p && p.src).filter(Boolean) }));
  return d;
}
function screenSetup() { app.replaceChildren(h("main", { class: "login" }, h("h1", {}, "Setup needed"), h("p", {}, "Open admin/config.js, paste your Supabase project URL and anon key, then reload. The README has the steps."))); }
function screenLogin(msg) {
  const em = h("input", { type: "email", autocomplete: "username", required: "", id: "lg-e" }), pw = h("input", { type: "password", autocomplete: "current-password", required: "", id: "lg-p" }), err = h("p", { class: "ast", role: "alert" }, msg || "");
  const f = h("form", { class: "login-card" }, h("div", { class: "af" }, h("label", { for: "lg-e" }, "Email"), em), h("div", { class: "af" }, h("label", { for: "lg-p" }, "Password"), pw), h("button", { class: "ab save", type: "submit" }, "Sign in"), err);
  f.onsubmit = async e => { e.preventDefault(); err.textContent = "Signing in…"; try { await login(em.value.trim(), pw.value); start(); } catch (x) { err.textContent = x.message; } };
  const mark = h("div", { class: "login-mark" }); mark.innerHTML = '<svg viewBox="0 0 24 24"><path d="M10 2h4v6h6v4h-6v10h-4V12H4V8h6z"/></svg>';
  app.replaceChildren(h("main", { class: "login" }, mark, h("h1", {}, "DCYM Bokaro"), h("p", {}, "Admin sign in"), f));
}
function screenEditor() {
  const saveBtn = h("button", { type: "button", class: "ab save" }, "Save changes"); saveBtn.onclick = () => save(saveBtn);
  const tabBar = h("div", { class: "adm-tabs", role: "tablist" }), body = h("div", { class: "adm-body" });
  const draw = () => { tabBar.replaceChildren(...Object.keys(tabs).map(k => h("button", { type: "button", role: "tab", "aria-selected": String(k === active), onclick: () => { active = k; draw(); } }, k))); body.replaceChildren(...tabs[active]()); body.scrollTop = 0; };
  const site = C.siteUrl ? h("a", { class: "ab ghost", href: C.siteUrl, target: "_blank", rel: "noopener" }, "View website") : "";
  app.replaceChildren(h("div", { class: "adm" }, h("div", { class: "adm-top" }, h("b", {}, "Edit website"), h("span", { class: "arow", style: "margin:0" }, site, h("button", { type: "button", class: "ab ghost", onclick: logout }, "Sign out"))), tabBar, body, h("div", { class: "adm-save" }, saveBtn, status)));
  draw();
}
async function start() {
  if (!base || !KEY) { screenSetup(); return; }
  if (!session) { screenLogin(); return; }
  try { await ensure(); D = merge(await loadData()); dirtyFlag = false; screenEditor(); }
  catch (e) { if (session) app.replaceChildren(h("main", { class: "login" }, h("p", { class: "ast", style: "color:#fff" }, e.message), h("button", { class: "ab", onclick: start }, "Try again"), h("button", { class: "ab ghost", onclick: logout }, "Sign out"))); else screenLogin(e.message); }
}
start();
