/* DCYM Bokaro church website script.
   Content: js/defaults.js -> data/site-data.js (optional) -> live content from your Supabase project (set in the admin site). */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const safeUrl = u => /^https?:\/\//i.test(u || "") ? u : "";
const calm = matchMedia("(prefers-reduced-motion:reduce)").matches;
const CFG = window.SITE_CONFIG || {};
const SB = (CFG.supabaseUrl || "").replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
const DEFAULT = window.DCYM_DEFAULT;
let DATA = null, lastPull = "";

/* ================= data ================= */
function mergeData(d) {
  d = d || {};
  const out = Object.assign(JSON.parse(JSON.stringify(DEFAULT)), d);
  for (const k of ["hero", "about", "verse", "contact"]) out[k] = Object.assign({}, DEFAULT[k], d[k] || {});
  out.contact.social = Object.assign({}, DEFAULT.contact.social, (d.contact || {}).social || {});
  for (const k of ["slides", "albums", "leaders", "activities", "events", "notices"]) if (!Array.isArray(out[k])) out[k] = DEFAULT[k];
  return out;
}
function setData(d) { DATA = mergeData(d); renderAll(); }
window.DCYM = { setData };

async function pullContent() {
  if (!SB || !CFG.supabaseKey) return;
  try {
    const r = await fetch(SB + "/rest/v1/site_content?id=eq.1&select=data", { headers: { apikey: CFG.supabaseKey, Authorization: "Bearer " + CFG.supabaseKey } });
    if (!r.ok) return;
    const rows = await r.json(), d = rows[0] && rows[0].data;
    if (d && Object.keys(d).length) {
      const s = JSON.stringify(d);
      if (s !== lastPull) { lastPull = s; try { localStorage.setItem("dcym-church-data", s); } catch (e) { } setData(Object.assign({}, window.SITE_DATA || {}, d)); }
    }
  } catch (e) { }
}

/* ================= helpers ================= */
const fmtDate = (d, o) => new Date(d + "T00:00").toLocaleDateString(undefined, o || { day: "numeric", month: "long", year: "numeric" });
const todayStr = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const initials = s => String(s || "").trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase() || "✝";
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .12, rootMargin: "0px 0px -6% 0px" });
function reveal(root = document) {
  $$(".rv:not([data-r])", root).forEach(el => {
    el.dataset.r = 1;
    if (!el.style.getPropertyValue("--d")) el.style.setProperty("--d", Math.min([...el.parentElement.children].indexOf(el), 7) * .08 + "s");
    io.observe(el);
  });
}

/* ================= renderers ================= */
function renderHero() {
  const h = DATA.hero;
  $("#hEyebrow").textContent = h.eyebrow;
  $("#hTitle").innerHTML = String(h.title).split(/\s+/).filter(Boolean).map((w, i) => `<span class="w"><span style="--i:${i}">${esc(w)}</span></span>`).join("");
  $("#hTitle").setAttribute("aria-label", h.title);
  $("#hText").textContent = h.text;
  const chip = $(".verse-chip");
  if (chip) { chip.lastChild.nodeType === 3 ? chip.lastChild.textContent = String(DATA.verse.ref).replace(/\s*\(.*\)\s*$/, "") : chip.append(String(DATA.verse.ref)); }
}
function renderAbout() {
  const a = DATA.about;
  $("#aWho").textContent = a.who; $("#aMission").textContent = a.mission; $("#aVision").textContent = a.vision; $("#aValues").textContent = a.values;
}
function renderActs() {
  $("#acts").innerHTML = DATA.activities.map((a, i) => `<article class="card rv"><div class="n">${String(i + 1).padStart(2, "0")}</div><h3>${esc(a.title)}</h3><p>${esc(a.desc)}</p></article>`).join("");
  reveal($("#acts"));
}
let showAll = false;
function renderEvents() {
  const t = todayStr();
  const all = DATA.events.map(e => Object.assign({}, e, { past: !!e.date && e.date < t }));
  const up = all.filter(e => !e.past).sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));
  const past = all.filter(e => e.past).sort((a, b) => b.date.localeCompare(a.date));
  const list = showAll ? up.concat(past) : up.slice(0, 3);
  $("#evs").innerHTML = list.length ? list.map(e => {
    const day = e.date ? new Date(e.date + "T00:00").getDate() : "TBA", mon = e.date ? fmtDate(e.date, { month: "short" }) : "";
    const meta = [e.time, e.venue].filter(Boolean).map(esc).join(" · ");
    const right = safeUrl(e.reg) && !e.past ? `<a class="btn btn-blue btn-sm mag" href="${esc(e.reg)}" target="_blank" rel="noopener"><span>Register</span><i class="arr"></i></a>` : (e.photo ? `<img class="ev-img" src="${esc(e.photo)}" alt="" loading="lazy">` : "");
    return `<article class="ev rv"><div class="ev-date"><b>${day}</b><small>${mon}</small></div><div>${e.past ? '<span class="tag">Past event</span>' : ""}<h3>${esc(e.title)}</h3>${meta ? `<p class="meta">${meta}</p>` : ""}<p>${esc(e.desc)}</p></div>${right}</article>`;
  }).join("") : '<p class="empty">No events at the moment. Please check back soon.</p>';
  const m = $("#evMore"); m.hidden = !(showAll || up.length > 3 || past.length); m.firstElementChild.textContent = showAll ? "Show fewer events" : "View all events";
  reveal($("#evs"));
}
function renderLeaders() {
  $("#leaders").innerHTML = DATA.leaders.map(l => {
    const av = l.photo ? `<img class="avatar" src="${esc(l.photo)}" alt="${esc(l.name || l.role)}" loading="lazy">` : `<div class="avatar" aria-hidden="true">${esc(initials(l.name || l.role))}</div>`;
    return `<article class="person rv">${av}<h3>${esc(l.name || l.role)}</h3>${l.name ? `<b>${esc(l.role)}</b>` : ""}${l.desc ? `<p>${esc(l.desc)}</p>` : ""}</article>`;
  }).join("");
  reveal($("#leaders"));
}
function renderNotices() {
  const l = [...DATA.notices].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  $("#notes").innerHTML = l.length ? l.map((n, i) => `<div class="acc-i rv"><button class="acc-b" type="button" aria-expanded="false" aria-controls="np${i}"><span><h3>${esc(n.title)}</h3><small>${n.date ? esc(fmtDate(n.date)) : esc(n.summary)}</small></span><span class="pm" aria-hidden="true"></span></button><div class="acc-p" id="np${i}"><div><p>${esc((n.date ? n.summary + "\n\n" : "") + (n.body || (n.date ? "" : "")))}</p></div></div></div>`).join("") : '<p class="empty" style="color:#fff;border-color:rgba(255,255,255,.25)">No notices at the moment.</p>';
  reveal($("#notes"));
}
function renderVerse() {
  const v = DATA.verse;
  $("#vText").setAttribute("aria-label", v.text);
  $("#vText").innerHTML = String(v.text).split(/\s+/).filter(Boolean).map((w, i) => `<span class="w" aria-hidden="true" style="transition-delay:${Math.min(i, 45) * 55}ms">${esc(w)}</span>`).join(" ");
  $("#vRef").textContent = v.ref;
}

/* contact + map (accepts the pasted Google Maps <iframe> code, an embed link, or just the address) */
function renderContact() {
  const c = DATA.contact;
  const so = Object.entries(c.social || {}).filter(([k, v]) => safeUrl(v)).map(([k, v]) => `<a href="${esc(v)}" rel="noopener" target="_blank">${esc(k)}</a>`);
  const wa = String(c.whatsapp || "").replace(/\D/g, ""); if (wa) so.push(`<a href="https://wa.me/${wa}" rel="noopener" target="_blank">WhatsApp</a>`);
  $("#cAddr").textContent = c.address || "Address to be added";
  $("#cEmail").innerHTML = c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : "To be added";
  $("#cPhone").innerHTML = c.phone ? `<a href="tel:${esc(String(c.phone).replace(/[^+\d]/g, ""))}">${esc(c.phone)}</a>` : "To be added";
  $("#cSocial").innerHTML = so.join(" · ") || "To be added";
  renderMap(c);
}
function renderMap(c) {
  const box = $("#map"); let raw = String(c.map || "").trim();
  const m = raw.match(/src=["']([^"']+)["']/i); if (m) raw = m[1].replace(/&amp;/g, "&");
  const addr = String(c.address || "").trim(), q = s => encodeURIComponent(s);
  let embed = "", open = "";
  if (/^https:\/\/(www\.)?google\.[a-z.]+\/maps\/embed/i.test(raw) || /^https:\/\/maps\.google\.[a-z.]+\/maps\?.*output=embed/i.test(raw)) { embed = raw; open = "https://www.google.com/maps/search/?api=1&query=" + q(addr || "CNI Church Bokaro"); }
  else if (/^https?:\/\//i.test(raw)) open = raw;
  else if (raw || addr) { const s = raw || addr; embed = "https://maps.google.com/maps?q=" + q(s) + "&output=embed"; open = "https://www.google.com/maps/search/?api=1&query=" + q(s); }
  if (!embed && !open) { box.textContent = "Map to be added."; return; }
  box.innerHTML = (embed ? `<iframe src="${esc(embed)}" title="Map showing our location" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>` : "") + `<a class="maplink" href="${esc(open)}" target="_blank" rel="noopener"><span>Open in Google Maps</span><span aria-hidden="true">↗</span></a>`;
}

/* ================= carousel ================= */
const car = { i: 0, timer: 0, items: [], paused: false };
function renderCarousel() {
  const real = DATA.slides.filter(s => s && s.photo);
  car.items = real.length ? real.map(s => ({ src: s.photo, caption: s.caption || "" })) : ["Worship", "Fellowship", "Service", "Joy"].map(t => ({ ph: t, caption: t }));
  $("#track").innerHTML = car.items.map((s, i) => s.ph
    ? `<div class="slide ph" role="group" aria-label="Sample slide ${i + 1}"><span>${esc(s.ph)}</span><b class="cap">Sample slide. Add your photos in the admin site.</b></div>`
    : `<button class="slide" type="button" role="group" aria-roledescription="slide" aria-label="${esc(s.caption || "Photo " + (i + 1))}" data-i="${i}"><img src="${esc(s.src)}" alt="${esc(s.caption)}" loading="${i < 2 ? "eager" : "lazy"}" draggable="false"><span class="cap">${esc(s.caption)}</span></button>`).join("");
  $("#dots").innerHTML = car.items.map((s, i) => `<button type="button" role="tab" aria-label="Go to photo ${i + 1}" aria-selected="false" data-i="${i}"></button>`).join("");
  car.i = 0; goTo(0, false);
}
const slides = () => $$("#track .slide");
function goTo(i, smooth = true) {
  const n = car.items.length; car.i = (i + n) % n;
  const tr = $("#track"), s = slides()[car.i]; if (!s) return;
  const left = s.offsetLeft - (tr.clientWidth - s.clientWidth) / 2;
  tr.scrollTo({ left, behavior: smooth && !calm ? "smooth" : "auto" });
  mark(car.i);
}
function mark(i) {
  slides().forEach((s, k) => s.classList.toggle("on", k === i));
  $$("#dots button").forEach((b, k) => b.setAttribute("aria-selected", String(k === i)));
}
function nearest() {
  const tr = $("#track"), mid = tr.scrollLeft + tr.clientWidth / 2; let best = 0, bd = 1e9;
  slides().forEach((s, k) => { const d = Math.abs(s.offsetLeft + s.clientWidth / 2 - mid); if (d < bd) { bd = d; best = k; } });
  return best;
}
function initCarousel() {
  const tr = $("#track"), box = $("#car"); let raf = 0, drag = null, inView = true;
  tr.addEventListener("scroll", () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { const k = nearest(); if (k !== car.i) { car.i = k; mark(k); } }); }, { passive: true });
  $("#cPrev").onclick = () => { goTo(car.i - 1); restart(); }; $("#cNext").onclick = () => { goTo(car.i + 1); restart(); };
  $("#dots").onclick = e => { const b = e.target.closest("button"); if (b) { goTo(+b.dataset.i); restart(); } };
  tr.addEventListener("keydown", e => { if (e.key === "ArrowRight") { goTo(car.i + 1); restart(); } if (e.key === "ArrowLeft") { goTo(car.i - 1); restart(); } });
  tr.addEventListener("click", e => { if (tr.dataset.moved) { e.preventDefault(); return; } const s = e.target.closest(".slide[data-i]"); if (s) openViewer("Moments", car.items.filter(x => x.src), +s.dataset.i); });
  /* mouse drag (touch uses native swipe) */
  tr.addEventListener("pointerdown", e => { if (e.pointerType !== "mouse") return; drag = { x: e.clientX, l: tr.scrollLeft }; delete tr.dataset.moved; });
  addEventListener("pointermove", e => { if (!drag) return; const dx = e.clientX - drag.x; if (Math.abs(dx) > 5) { tr.dataset.moved = 1; tr.style.scrollSnapType = "none"; tr.scrollLeft = drag.l - dx; } });
  addEventListener("pointerup", () => { if (!drag) return; drag = null; tr.style.scrollSnapType = ""; if (tr.dataset.moved) { goTo(nearest()); setTimeout(() => delete tr.dataset.moved, 60); restart(); } });
  /* autoplay: pauses on hover, focus, touch, hidden tab, or when off-screen */
  const play = () => { clearInterval(car.timer); if (calm) return; car.timer = setInterval(() => { if (!car.paused && inView && !document.hidden) goTo(car.i + 1); }, 5200); };
  const restart = play;
  box.addEventListener("pointerenter", () => car.paused = true); box.addEventListener("pointerleave", () => car.paused = false);
  box.addEventListener("focusin", () => car.paused = true); box.addEventListener("focusout", () => car.paused = false);
  box.addEventListener("touchstart", () => { car.paused = true; setTimeout(() => car.paused = false, 6000); }, { passive: true });
  new IntersectionObserver(es => inView = es[0].isIntersecting, { threshold: .25 }).observe(box);
  addEventListener("resize", () => goTo(car.i, false));
  play();
}

/* ================= albums + photo viewer ================= */
function albumPhotos(a) { return (a.photos || []).map(p => typeof p === "string" ? { src: p, caption: "" } : p).filter(p => p && p.src); }
function renderAlbums() {
  const real = DATA.albums.filter(a => albumPhotos(a).length);
  if (!real.length) {
    $("#albumGrid").innerHTML = ["Youth fellowship", "Retreat", "Christmas celebration"].map(t => `<div class="album rv"><div class="stack"><div class="cover"><span class="ph-t">${esc(t)}</span></div><span class="badge">Sample</span></div><h3>${esc(t)}</h3><small>Add albums in the admin site</small></div>`).join("");
    reveal($("#albumGrid")); return;
  }
  $("#albumGrid").innerHTML = real.map((a, i) => {
    const ps = albumPhotos(a);
    return `<button class="album rv" type="button" data-i="${DATA.albums.indexOf(a)}" aria-label="Open album ${esc(a.title)}, ${ps.length} photos"><div class="stack"><div class="cover"><img src="${esc(a.cover || ps[0].src)}" alt="" loading="lazy"></div><span class="badge">${ps.length} photo${ps.length > 1 ? "s" : ""}</span></div><h3>${esc(a.title || "Untitled album")}</h3><small>${a.date ? esc(fmtDate(a.date)) : ""}${a.date && a.desc ? " · " : ""}${esc(a.desc || "")}</small></button>`;
  }).join("");
  reveal($("#albumGrid"));
}
const V = { list: [], i: 0, title: "" };
function openViewer(title, list, start = 0) {
  if (!list.length) return;
  V.list = list; V.i = start; V.title = title;
  $("#vTitle").textContent = title;
  $("#vThumbs").innerHTML = list.map((p, i) => `<button type="button" aria-label="Photo ${i + 1}" data-i="${i}"><img src="${esc(p.src)}" alt="" loading="lazy"></button>`).join("");
  $("#viewer").showModal(); showPhoto(start, 0);
}
function showPhoto(i, dir) {
  const n = V.list.length; V.i = (i + n) % n;
  const img = $("#vImg"), p = V.list[V.i];
  const swap = () => { img.src = p.src; img.alt = p.caption || V.title; img.className = dir ? (dir > 0 ? "in-l" : "in-r") : ""; };
  if (dir && !calm) { img.className = dir > 0 ? "out-l" : "out-r"; setTimeout(swap, 200); } else swap();
  $("#vCount").textContent = `${V.i + 1} / ${n}`; $("#vCap").textContent = p.caption || "";
  $$("#vThumbs button").forEach((b, k) => { const on = k === V.i; on ? b.setAttribute("aria-current", "true") : b.removeAttribute("aria-current"); if (on) b.scrollIntoView({ inline: "center", block: "nearest", behavior: calm ? "auto" : "smooth" }); });
  [V.i + 1, V.i - 1].forEach(k => { const q = V.list[(k + n) % n]; if (q) new Image().src = q.src; });
}
function closeViewer() { const d = $("#viewer"); if (!d.open) return; if (calm) { d.close(); return; } d.classList.add("closing"); setTimeout(() => { d.close(); d.classList.remove("closing"); }, 260); }
function initViewer() {
  const d = $("#viewer");
  $("#vPrev").onclick = () => showPhoto(V.i - 1, -1); $("#vNext").onclick = () => showPhoto(V.i + 1, 1); $("#vClose").onclick = closeViewer;
  $("#vThumbs").onclick = e => { const b = e.target.closest("button"); if (b) { const k = +b.dataset.i; showPhoto(k, k > V.i ? 1 : -1); } };
  d.addEventListener("cancel", e => { e.preventDefault(); closeViewer(); });
  d.addEventListener("click", e => { if (e.target === d || e.target === $("#vStage")) closeViewer(); });
  d.addEventListener("keydown", e => { if (e.key === "ArrowLeft") showPhoto(V.i - 1, -1); if (e.key === "ArrowRight") showPhoto(V.i + 1, 1); });
  let sx = null; const st = $("#vStage");
  st.addEventListener("pointerdown", e => { sx = e.clientX; }); st.addEventListener("pointerup", e => { if (sx == null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 50) showPhoto(V.i + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1); });
  $("#albumGrid").addEventListener("click", e => { const b = e.target.closest(".album[data-i]"); if (!b) return; const a = DATA.albums[+b.dataset.i]; openViewer(a.title || "Album", albumPhotos(a), 0); });
}

/* ================= page chrome ================= */
function renderAll() { renderHero(); renderAbout(); renderActs(); renderEvents(); renderCarousel(); renderAlbums(); renderVerse(); renderLeaders(); renderNotices(); renderContact(); reveal(); observeVerse(); }
let vObs; function observeVerse() { if (vObs) vObs.disconnect(); $(".verse").classList.remove("in"); vObs = new IntersectionObserver(es => { if (es[0].isIntersecting) { $(".verse").classList.add("in"); vObs.disconnect(); } }, { threshold: .35 }); vObs.observe($("#vText")); }

let scrollRaf = 0;
function smoothTo(y, done) {
  cancelAnimationFrame(scrollRaf);
  const max = document.documentElement.scrollHeight - innerHeight; y = Math.max(0, Math.min(y, max));
  const y0 = scrollY, dist = y - y0;
  if (calm || Math.abs(dist) < 2) { scrollTo(0, y); done && done(); return; }
  const dur = Math.max(600, Math.min(1300, Math.abs(dist) * .5)), t0 = performance.now(), ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const stop = () => { cancelAnimationFrame(scrollRaf); removeEventListener("wheel", stop); removeEventListener("touchstart", stop); };
  addEventListener("wheel", stop, { passive: true }); addEventListener("touchstart", stop, { passive: true });
  const step = now => { const t = Math.min(1, (now - t0) / dur); scrollTo(0, y0 + dist * ease(t)); if (t < 1) scrollRaf = requestAnimationFrame(step); else { stop(); done && done(); } };
  scrollRaf = requestAnimationFrame(step);
}
function initNav() {
  const dock = $("#dock"), links = $("#links"), burger = $("#burger"), pill = $("#pill"), as = $$("#links a[href^='#']");
  let active = null, lastY = scrollY;
  const place = a => { if (!a || getComputedStyle(pill).display === "none") return; pill.style.opacity = 1; pill.style.width = a.offsetWidth + "px"; pill.style.transform = `translateX(${a.offsetLeft}px)`; };
  const setActive = id => { active = as.find(a => a.getAttribute("href") === "#" + id) || null; as.forEach(a => { const on = a === active; a.classList.toggle("on", on); on ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current"); }); if (active) place(active); else pill.style.opacity = 0; };
  const spy = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) setActive(e.target.id); }), { rootMargin: "-45% 0px -50% 0px" });
  $$("main section[id]").forEach(sec => spy.observe(sec));
  as.forEach(a => { a.addEventListener("pointerenter", () => place(a)); a.addEventListener("pointerleave", () => place(active)); });
  addEventListener("resize", () => place(active));
  const setOpen = o => { links.classList.toggle("open", o); burger.setAttribute("aria-expanded", o); burger.setAttribute("aria-label", o ? "Close menu" : "Open menu"); };
  burger.onclick = () => setOpen(!links.classList.contains("open"));
  links.addEventListener("click", e => { if (e.target.closest("a")) setOpen(false); });
  addEventListener("keydown", e => { if (e.key === "Escape" && links.classList.contains("open")) { setOpen(false); burger.focus(); } });
  addEventListener("pointerdown", e => { if (links.classList.contains("open") && !e.target.closest("#dock")) setOpen(false); });
  const ring = $("#ringFg"), top = $("#toTop"); top.onclick = () => smoothTo(0);
  let ticking = false;
  const onScroll = () => {
    const y = scrollY, h = document.documentElement.scrollHeight - innerHeight;
    dock.classList.toggle("solid", y > 40);
    if (!links.classList.contains("open")) dock.classList.toggle("away", y > 260 && y > lastY + 4 ? true : (y < lastY - 4 || y < 260 ? false : dock.classList.contains("away")));
    lastY = y;
    top.classList.toggle("show", y > 700); ring.style.strokeDashoffset = 132 * (1 - (h > 0 ? y / h : 0));
    if (!calm && y < innerHeight * 1.2) $(".hero-bg").style.translate = `0 ${y * .18}px`;
    ticking = false;
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true }); onScroll();
  document.addEventListener("click", e => {
    const a = e.target.closest('a[href^="#"]'); if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
    const id = a.getAttribute("href").slice(1), el = id ? document.getElementById(id) : document.body; if (!el) return;
    e.preventDefault();
    const off = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 80;
    smoothTo(id ? el.getBoundingClientRect().top + scrollY - (id === "home" ? 0 : off) + 1 : 0, () => { try { history.replaceState(null, "", id ? "#" + id : location.pathname + location.search); } catch (_) { } });
  });
}
function initEffects() {
  /* floating dust in the hero */
  const dust = $("#dust"); if (dust && !calm) for (let i = 0; i < 22; i++) { const s = document.createElement("i"); s.style.cssText = `--x:${(i * 4.7 + (i % 3) * 5) % 100}%;--s:${3 + (i * 7) % 7}px;--t:${12 + (i * 5) % 13}s;--d:-${(i * 1.9) % 16}s`; dust.appendChild(s); }
  /* button ripple + magnetic hover */
  document.addEventListener("pointerdown", e => {
    if (calm) return; const b = e.target.closest(".btn"); if (!b) return;
    const r = b.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2.2, s = document.createElement("span");
    s.className = "ripple"; s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
    b.appendChild(s); s.addEventListener("animationend", () => s.remove());
  });
  if (matchMedia("(hover:hover)").matches && !calm) {
    document.addEventListener("pointermove", e => {
      const b = e.target.closest && e.target.closest(".mag"); if (!b) return;
      const r = b.getBoundingClientRect(); b.style.translate = `${((e.clientX - r.left) / r.width - .5) * 10}px ${((e.clientY - r.top) / r.height - .5) * 8}px`;
    });
    document.addEventListener("pointerout", e => { const b = e.target.closest && e.target.closest(".mag"); if (b && !b.contains(e.relatedTarget)) b.style.translate = ""; });
    document.addEventListener("pointermove", e => { const c = e.target.closest && e.target.closest(".card"); if (!c) return; const r = c.getBoundingClientRect(); c.style.setProperty("--mx", e.clientX - r.left + "px"); c.style.setProperty("--my", e.clientY - r.top + "px"); });
  }
  /* notice accordion */
  $("#notes").addEventListener("click", e => { const b = e.target.closest(".acc-b"); if (!b) return; const it = b.parentElement, o = !it.classList.contains("open"); it.classList.toggle("open", o); b.setAttribute("aria-expanded", o); });
  $("#evMore").onclick = () => { showAll = !showAll; renderEvents(); };
}

/* ================= contact form ================= */
function initForm() {
  const f = $("#form"), ok = $("#ok"), btn = $("button[type=submit]", f), label = btn.firstElementChild;
  const setErr = (id, m) => { $(`.err[data-for="${id}"]`).textContent = m || ""; };
  f.addEventListener("submit", async e => {
    e.preventDefault(); ok.textContent = ""; ok.style.color = "";
    const name = $("#f-name").value.trim(), email = $("#f-email").value.trim(), msg = $("#f-msg").value.trim(); let bad = 0;
    setErr("f-name", name ? "" : (bad++, "Please enter your name."));
    setErr("f-email", /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? "" : (bad++, "Please enter a valid email address."));
    setErr("f-msg", msg ? "" : (bad++, "Please write a message."));
    if (bad) return;
    btn.disabled = true; label.textContent = "Sending…";
    try {
      if (!SB || !CFG.supabaseKey) throw new Error("offline");
      const r = await fetch(SB + "/rest/v1/messages", { method: "POST", headers: { apikey: CFG.supabaseKey, Authorization: "Bearer " + CFG.supabaseKey, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ name, email, message: msg, subject: "Website message" }) });
      if (!r.ok) throw new Error("failed");
      f.reset(); ok.textContent = "Thank you. Your message has been sent. We will get back to you soon.";
    } catch (x) {
      const to = DATA.contact.email;
      if (to) { location.href = `mailto:${to}?subject=${encodeURIComponent("Message from the DCYM Bokaro website")}&body=${encodeURIComponent(msg + "\n\n" + name + " (" + email + ")")}`; ok.textContent = "Opening your email app to send the message."; }
      else { ok.style.color = "#c0362c"; ok.textContent = "Sorry, we could not send your message just now. Please try again later."; }
    }
    btn.disabled = false; label.textContent = "Send message";
  });
}

/* ================= start ================= */
$("#yr").textContent = new Date().getFullYear();
initNav(); initEffects(); initCarousel(); initViewer(); initForm();
let cached = null; try { cached = JSON.parse(localStorage.getItem("dcym-church-data") || "null"); } catch (e) { }
setData(Object.assign({}, window.SITE_DATA || {}, cached || {}));
pullContent(); setInterval(pullContent, 60000);


/* ================= light / dark mode ================= */
function initTheme() {
  const root = document.documentElement, btn = $("#themeBtn"), meta = document.querySelector('meta[name="theme-color"]');
  const sync = () => { const d = root.getAttribute("data-theme") === "dark"; btn.setAttribute("aria-pressed", d); btn.setAttribute("aria-label", d ? "Switch to light mode" : "Switch to dark mode"); };
  const apply = t => { root.setAttribute("data-theme", t); try { localStorage.setItem("dcym-theme", t); } catch (e) { } sync(); };
  sync();
  btn.addEventListener("click", () => {
    const t = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    if (calm) { apply(t); return; }
    if (!document.startViewTransition) { root.classList.add("theming"); apply(t); setTimeout(() => root.classList.remove("theming"), 750); return; }
    const r = btn.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const vt = document.startViewTransition(() => apply(t));
    vt.ready.then(() => root.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] }, { duration: 850, easing: "cubic-bezier(.4,0,.15,1)", pseudoElement: "::view-transition-new(root)" })).catch(() => { });
  });
  matchMedia("(prefers-color-scheme:dark)").addEventListener && matchMedia("(prefers-color-scheme:dark)").addEventListener("change", e => { let saved = null; try { saved = localStorage.getItem("dcym-theme"); } catch (x) { } if (!saved) apply(e.matches ? "dark" : "light"); });
}
initTheme();

/* If a host or preview blocks the Google Maps frame, replace the grey error box with a friendly card + link. */
document.addEventListener("securitypolicyviolation", e => {
  if (!/frame|child/i.test(e.violatedDirective) || !/google\.[a-z.]+\/maps/i.test(e.blockedURI)) return;
  const box = $("#map"), link = $(".maplink", box), fr = $("iframe", box); if (!fr) return;
  const card = document.createElement("div"); card.className = "map-fallback";
  card.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.500a2.500 2.500 0 0 1 0 5z"/></svg><b>Find us on Google Maps</b><span>The live map cannot be shown inside this preview. It loads normally once the site is on its own web address.</span>';
  fr.replaceWith(card);
});
