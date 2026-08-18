/* ═══════════════════════════════════════════════
   Beach Birthday — app engine
   scroll = time of day (12:00 → 22:00)
   ═══════════════════════════════════════════════ */
"use strict";
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
let C = null; // decrypted content

/* ───────── crypto gate ───────── */
const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

let mediaKey = null; // kept after unlock to decrypt photos/videos on the fly

async function decryptContent(pw) {
  const enc = window.ENC_CONTENT;
  const keyMat = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: b64(enc.salt), iterations: 210000, hash: "SHA-256" },
    keyMat, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64(enc.iv) }, key, b64(enc.data));
  mediaKey = key;
  return JSON.parse(new TextDecoder().decode(plain));
}

const MIME = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
  gif: "image/gif", mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm" };

/* fetch <file>.enc ([12-byte IV][ciphertext]) and decrypt to an object URL */
async function loadEncMedia(file) {
  const res = await fetch("assets/photos/" + file + ".enc");
  if (!res.ok) throw new Error("missing " + file);
  const buf = new Uint8Array(await res.arrayBuffer());
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: buf.slice(0, 12) }, mediaKey, buf.slice(12));
  const ext = file.split(".").pop().toLowerCase();
  return URL.createObjectURL(new Blob([plain], { type: MIME[ext] || "application/octet-stream" }));
}

const gateForm = $("#gate-form");
const gateCard = $(".gate-card");
const gateErr = $("#gate-error");
let attempts = 0;

gateForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const pw = $("#gate-pw").value.trim();
  if (!pw) return;
  $("#gate-btn").disabled = true;
  try {
    C = await decryptContent(pw);
    unlock();
  } catch {
    attempts++;
    gateErr.textContent = attempts >= 3
      ? "Still stuck? Try the hint below 🐚"
      : "Hmm… that's not the one. Try again!";
    gateCard.classList.remove("shake");
    void gateCard.offsetWidth;
    gateCard.classList.add("shake");
    $("#gate-btn").disabled = false;
    $("#gate-pw").select();
  }
});

$("#gate-hint-btn").addEventListener("click", () => {
  $("#gate-hint").textContent = window.ENC_CONTENT.hint || "";
});

function unlock() {
  buildContent();
  $("#beach").hidden = false;
  $("#hud").hidden = false;
  document.body.classList.remove("locked");
  $("#gate").classList.add("open");
  setTimeout(() => $("#gate").remove(), 1600);
  startScene();
  initInteractions();
  startAudio(true); // unlock click counts as a user gesture
}

/* ───────── content build ───────── */
function put(id, text) { const el = $(id); if (el) el.textContent = text || ""; }

function buildContent() {
  put("#c-eyebrow", C.eyebrow);
  put("#c-title-1", C.title1);
  put("#c-title-2", C.title2);
  put("#c-hero-sub", C.heroSub);
  put("#c-scroll-cue", C.scrollCue);
  put("#c-photos-title", C.photosTitle);
  put("#c-photos-sub", C.photosSub);
  put("#c-wave-title", C.waveTitle);
  put("#c-wave-sub", C.waveSub);
  put("#c-ride-btn", C.rideBtn);
  put("#c-mem-title", C.memTitle);
  put("#c-mem-sub", C.memSub);
  put("#c-reasons-title", C.reasonsTitle);
  put("#c-reasons-sub", C.reasonsSub);
  put("#c-letter-title", C.letterZoneTitle);
  put("#c-letter-sub", C.letterZoneSub);
  put("#c-bottle-label", C.bottleLabel);
  put("#c-letter-date", C.letterDate);
  put("#c-letter-head", C.letterHead);
  put("#c-letter-sign", C.letterSign);
  put("#c-night-title", C.nightTitle);
  put("#c-night-sub", C.nightSub);
  put("#c-footer", C.footer);
  put("#c-bonus-title", C.bonusTitle);

  const drift = $("#photo-drift");
  C.photos.forEach((p) => {
    const fig = document.createElement("figure");
    fig.className = "polaroid reveal";
    const isVideo = /\.(mp4|mov|webm)$/i.test(p.file);
    let media;
    const fallback = () => {
      const ph = document.createElement("div");
      ph.className = "polaroid-ph";
      ph.innerHTML = "<span>🏖️</span><span>assets/photos/" + p.file + "<br>photo goes here</span>";
      media.replaceWith(ph);
    };
    if (isVideo) {
      media = document.createElement("video");
      media.className = "polaroid-img";
      media.muted = true;
      media.loop = true;
      media.autoplay = true;
      media.playsInline = true;
      media.setAttribute("playsinline", "");
      media.addEventListener("loadeddata", () => media.play().catch(() => {}));
    } else {
      media = document.createElement("img");
      media.className = "polaroid-img";
      media.alt = p.caption || "";
    }
    // media ships encrypted (<file>.enc); decrypt with the unlock key, then show
    loadEncMedia(p.file)
      .then((url) => { media.onerror = fallback; media.src = url; })
      .catch(fallback);
    const cap = document.createElement("figcaption");
    cap.className = "polaroid-cap";
    cap.textContent = p.caption || "";
    fig.append(media, cap);
    drift.append(fig);
  });

  const mem = $("#memory-line");
  C.memories.forEach((m) => {
    const li = document.createElement("li");
    li.className = "memory reveal";
    li.innerHTML =
      `<p class="memory-date"></p><p class="memory-title"></p><p class="memory-text"></p>`;
    li.querySelector(".memory-date").textContent = m.date;
    li.querySelector(".memory-title").textContent = m.title;
    li.querySelector(".memory-text").textContent = m.text;
    mem.append(li);
  });

  const rc = $("#reason-cards");
  C.reasons.forEach((r) => {
    const d = document.createElement("div");
    d.className = "reason reveal";
    d.innerHTML = `<span class="reason-emoji"></span><p class="reason-title"></p><p class="reason-text"></p>`;
    d.querySelector(".reason-emoji").textContent = r.emoji;
    d.querySelector(".reason-title").textContent = r.title;
    d.querySelector(".reason-text").textContent = r.text;
    rc.append(d);
  });

  const body = $("#c-letter-body");
  C.letterBody.forEach((par) => {
    const p = document.createElement("p");
    p.textContent = par;
    body.append(p);
  });
  const bb = $("#c-bonus-body");
  C.bonusBody.forEach((par) => {
    const p = document.createElement("p");
    p.textContent = par;
    bb.append(p);
  });

  const io = new IntersectionObserver((ents) => {
    ents.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
  }, { threshold: 0.18 });
  $$(".reveal").forEach((el) => io.observe(el));
}

/* ───────── time-of-day palette ───────── */
const STOPS = [
  // p, skyTop, skyBot, seaTop, seaBot, sandA, sandB, glint, starO, cloudO, glintPow
  [0.00, "#3f9fdc", "#cfeaf5", "#1f86b8", "#7fd0dd", "#f2ddba", "#e3c493", "#fff7dd", 0.00, 0.95, 0.55],
  [0.30, "#4f9fd4", "#e3eedd", "#22809f", "#9fd4c8", "#f0d9b0", "#e0bf8c", "#ffefb8", 0.00, 0.85, 0.70],
  [0.50, "#6f95c8", "#ffd9a0", "#2a6f9a", "#d9a97a", "#eccfa0", "#d8b280", "#ffd98a", 0.05, 0.65, 1.00],
  [0.68, "#5f5494", "#ff9a5e", "#37477c", "#d97a52", "#d9a988", "#bd8a68", "#ffb45e", 0.18, 0.45, 1.00],
  [0.84, "#2c2a5e", "#a05576", "#1c2a55", "#6f4a6a", "#8f7a88", "#6f5c6c", "#f0a878", 0.60, 0.25, 0.80],
  [1.00, "#0a1330", "#233a64", "#0c1c3a", "#2a4a72", "#5c5a78", "#42405c", "#cfe0ff", 1.00, 0.12, 0.85],
];

function hexToRgb(h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}
function mixHex(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`;
}
function palette(p) {
  let i = 0;
  while (i < STOPS.length - 2 && p > STOPS[i + 1][0]) i++;
  const a = STOPS[i], b = STOPS[i + 1];
  const t = Math.min(1, Math.max(0, (p - a[0]) / (b[0] - a[0])));
  const out = { skyTop: mixHex(a[1], b[1], t), skyBot: mixHex(a[2], b[2], t),
    seaTop: mixHex(a[3], b[3], t), seaBot: mixHex(a[4], b[4], t),
    sandA: mixHex(a[5], b[5], t), sandB: mixHex(a[6], b[6], t),
    glint: mixHex(a[7], b[7], t),
    starO: a[8] + (b[8] - a[8]) * t,
    cloudO: a[9] + (b[9] - a[9]) * t,
    glintPow: a[10] + (b[10] - a[10]) * t };
  return out;
}

/* ───────── scene engine ───────── */
const sea = $("#sea");
const ctx2d = sea.getContext("2d");
let W = 0, H = 0, DPR = 1, seaH = 0;
let scrollP = 0, pal = palette(0);
let glints = [];

function resizeSea() {
  DPR = Math.min(devicePixelRatio || 1, 2);
  W = innerWidth;
  seaH = Math.round(innerHeight * 0.46);
  H = seaH;
  sea.width = W * DPR;
  sea.height = H * DPR;
  sea.style.height = H + "px";
  ctx2d.setTransform(DPR, 0, 0, DPR, 0, 0);
  makeGlints();
}

function makeGlints() {
  const n = Math.round(Math.min(260, W * 0.28));
  glints = [];
  for (let i = 0; i < n; i++) {
    const lane = Math.random() < 0.55; // more than half live in the specular lane
    glints.push({
      lane,
      u: lane ? (Math.random() * 2 - 1) : (Math.random() * 2 - 1) * 6, // lane-relative x
      y: Math.pow(Math.random(), 0.6), // 0 horizon → 1 shore (denser far away)
      w: 3 + Math.random() * 9,
      ph: Math.random() * Math.PI * 2,
      sp: 0.6 + Math.random() * 1.6,
    });
  }
}

function updateSceneVars() {
  pal = palette(scrollP);
  const st = document.documentElement.style;
  st.setProperty("--sky-top", pal.skyTop);
  st.setProperty("--sky-bot", pal.skyBot);
  st.setProperty("--star-o", pal.starO.toFixed(2));
  $$(".cloud").forEach((c) => (c.style.opacity = pal.cloudO));

  // sun: high at noon → sets at p≈0.8 (horizon = top of sea canvas)
  const horizonY = innerHeight - seaH;
  const sunP = Math.min(1, scrollP / 0.8);
  const sunY = innerHeight * 0.16 + (horizonY + 90 - innerHeight * 0.16) * easeInOut(sunP);
  const sun = $("#sun");
  sun.style.top = sunY + "px";
  sun.style.opacity = scrollP > 0.8 ? Math.max(0, 1 - (scrollP - 0.8) * 12) : 1;
  // moon rises after sunset
  const moon = $("#moon");
  const mP = Math.max(0, (scrollP - 0.78) / 0.22);
  moon.style.top = (horizonY + 40 - (horizonY + 40 - innerHeight * 0.2) * easeInOut(mP)) + "px";
  moon.style.left = "68%";
  moon.style.opacity = mP <= 0 ? 0 : Math.min(1, mP * 1.6);

  // parasol set sits on the fixed sand; fade it out as we walk away
  const hb = $("#hero-beach-set");
  if (hb) {
    const fade = Math.max(0, 1 - scrollY / (innerHeight * 0.72));
    hb.style.opacity = fade;
    hb.style.visibility = fade <= 0.02 ? "hidden" : "visible";
  }

  // clock 12:00 → 22:00
  const mins = 720 + Math.round(scrollP * 600);
  const hh = Math.floor(mins / 60), mm = mins % 60;
  $("#clock-time").textContent = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
function easeInOut(t) { return t * t * (3 - 2 * t); }

function lightX() {
  // x of the light source that owns the specular lane
  return scrollP < 0.8 ? W / 2 : W * 0.68;
}

let tPrev = 0;
function drawSea(tms) {
  const t = tms / 1000;
  const dt = Math.min(0.05, t - tPrev); tPrev = t;

  // water
  const sandTop = H * 0.8;
  const g = ctx2d.createLinearGradient(0, 0, 0, sandTop);
  g.addColorStop(0, pal.seaTop);
  g.addColorStop(1, pal.seaBot);
  ctx2d.clearRect(0, 0, W, H);
  ctx2d.fillStyle = g;
  ctx2d.fillRect(0, 0, W, sandTop + 8);

  // sand
  const sg = ctx2d.createLinearGradient(0, sandTop, 0, H);
  sg.addColorStop(0, pal.sandA);
  sg.addColorStop(1, pal.sandB);
  ctx2d.fillStyle = sg;
  ctx2d.fillRect(0, sandTop, W, H - sandTop);

  // tide foam edge (two lapping lines)
  const tide = Math.sin(t * 0.45) * 9;
  for (let k = 0; k < 2; k++) {
    ctx2d.beginPath();
    const yBase = sandTop + tide - k * 7;
    ctx2d.moveTo(0, yBase);
    for (let x = 0; x <= W; x += 22) {
      ctx2d.lineTo(x, yBase + Math.sin(x * 0.045 + t * (1.1 + k * 0.4)) * 3.4);
    }
    ctx2d.strokeStyle = k === 0 ? "rgba(255,255,255,.85)" : "rgba(255,255,255,.4)";
    ctx2d.lineWidth = k === 0 ? 3.4 : 2.2;
    ctx2d.stroke();
  }

  // ── 윤슬 : specular glints ──
  const lx = lightX();
  const pow = pal.glintPow * (reducedMotion ? 0.6 : 1);
  const glintRgb = pal.glint.match(/\d+/g).join(",");
  for (const p of glints) {
    p.ph += dt * p.sp * 2.2;
    const y = p.y * (sandTop - 10) + 4;
    const persp = 0.25 + p.y * 0.75;               // lane widens toward viewer
    const laneHalf = W * 0.055 + W * 0.16 * p.y;    // triangle spread
    const x = lx + p.u * laneHalf;
    if (x < -20 || x > W + 20) continue;
    const distLane = Math.abs(x - lx) / laneHalf;   // 0 center → bright
    const laneBoost = p.lane ? Math.max(0, 1 - distLane) : 0.22;
    const tw = (Math.sin(p.ph) * 0.5 + 0.5) ** 2;   // twinkle
    const a = Math.min(1, tw * laneBoost * pow * 1.25);
    if (a < 0.02) continue;
    const w = p.w * persp * (1 + tw * 0.6);
    ctx2d.fillStyle = `rgba(${glintRgb},${a.toFixed(3)})`;
    ctx2d.beginPath();
    ctx2d.ellipse(x, y, w, Math.max(0.8, w * 0.16), 0, 0, Math.PI * 2);
    ctx2d.fill();
  }

  // soft light column under the sun/moon
  const colG = ctx2d.createLinearGradient(0, 0, 0, sandTop);
  colG.addColorStop(0, `rgba(${glintRgb},${(0.20 * pow).toFixed(3)})`);
  colG.addColorStop(1, `rgba(${glintRgb},0)`);
  ctx2d.fillStyle = colG;
  ctx2d.beginPath();
  ctx2d.moveTo(lx - W * 0.03, 0);
  ctx2d.lineTo(lx + W * 0.03, 0);
  ctx2d.lineTo(lx + W * 0.2, sandTop);
  ctx2d.lineTo(lx - W * 0.2, sandTop);
  ctx2d.closePath();
  ctx2d.fill();

  requestAnimationFrame(drawSea);
}

function onScroll() {
  const max = document.documentElement.scrollHeight - innerHeight;
  scrollP = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
  updateSceneVars();
}

function startScene() {
  resizeSea();
  updateSceneVars();
  addEventListener("resize", () => { resizeSea(); updateSceneVars(); });
  addEventListener("scroll", onScroll, { passive: true });
  requestAnimationFrame(drawSea);
}

/* ───────── surf audio (generated, no file) ───────── */
let AC = null, surfOn = false;
function buildSurf() {
  AC = new (window.AudioContext || window.webkitAudioContext)();
  const len = AC.sampleRate * 4;
  const buf = AC.createBuffer(1, len, AC.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) { // brown noise
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    d[i] = last * 3.5;
  }
  const src = AC.createBufferSource();
  src.buffer = buf; src.loop = true;
  const filt = AC.createBiquadFilter();
  filt.type = "lowpass"; filt.frequency.value = 520; filt.Q.value = 0.6;
  const gain = AC.createGain();
  gain.gain.value = 0.16;
  const master = AC.createGain();
  master.gain.value = 0.9;
  // slow swells → waves rolling in
  [[0.061, 0.09], [0.107, 0.06]].forEach(([f, depth]) => {
    const o = AC.createOscillator();
    o.frequency.value = f;
    const og = AC.createGain();
    og.gain.value = depth;
    o.connect(og).connect(gain.gain);
    o.start();
  });
  const fo = AC.createOscillator();
  fo.frequency.value = 0.083;
  const fog = AC.createGain();
  fog.gain.value = 260;
  fo.connect(fog).connect(filt.frequency);
  fo.start();
  src.connect(filt).connect(gain).connect(master).connect(AC.destination);
  src.start();
}
function startAudio(on) {
  const btn = $("#sound-toggle");
  const apply = () => {
    btn.textContent = surfOn ? "🔊" : "🔇";
    btn.classList.toggle("on", surfOn);
    btn.setAttribute("aria-pressed", surfOn);
  };
  btn.addEventListener("click", async () => {
    if (!AC) buildSurf();
    surfOn = !surfOn;
    if (surfOn) await AC.resume(); else await AC.suspend();
    apply();
  });
  if (on && !reducedMotion) {
    try { buildSurf(); surfOn = true; } catch { surfOn = false; }
  }
  apply();
}

/* ───────── toast ───────── */
let toastTimer = null;
function toast(msg, ms = 2600) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), ms);
}

/* ───────── interactions ───────── */
function initInteractions() {
  /* cheers 🥂 */
  $("#cheers").addEventListener("click", () => {
    const set = $("#parasol-set");
    set.classList.remove("clink");
    void set.getBBox && set.getBoundingClientRect();
    set.classList.add("clink");
    setTimeout(() => set.classList.remove("clink"), 800);
    toast(C.cheersToast);
  });

  /* sun easter egg — 5 taps */
  let sunTaps = 0, sunTimer = null;
  $("#sun").addEventListener("click", () => {
    sunTaps++;
    clearTimeout(sunTimer);
    sunTimer = setTimeout(() => (sunTaps = 0), 2500);
    if (sunTaps === 5) {
      sunTaps = 0;
      sparkleBurst($("#sun"));
      toast(C.sunEggToast, 3200);
    }
  });
  $("#sun").style.pointerEvents = "auto";
  $("#sun").style.cursor = "pointer";

  /* wave ride — float first; try again and the jet ski comes out */
  const rideBtn = $("#ride-btn");
  let rideCount = 0;
  rideBtn.addEventListener("click", () => {
    rideBtn.disabled = true;
    rideCount++;
    const jet = rideCount % 2 === 0; // 1st float, 2nd jet ski, then alternate
    rideWave(jet, () => {
      rideBtn.disabled = false;
      $("#c-ride-btn").textContent = C.rideBtnAgain || C.rideBtn;
      toast(rideCount === 1 ? C.rideToastFirst : jet ? C.rideToastJet : C.rideToastFloat, 3400);
    });
  });

  /* shells */
  const found = new Set();
  $$(".shell").forEach((s) => {
    s.addEventListener("click", () => {
      const id = s.dataset.shell;
      if (found.has(id)) return;
      found.add(id);
      s.classList.add("got");
      const dot = document.querySelector(`.shell-dot[data-p="${id}"]`);
      if (dot) dot.classList.add("got");
      if (found.size === 3) {
        setTimeout(() => {
          $("#bonus-bottle").hidden = false;
          toast("🐚 All three shells! Something just washed up on the shore…", 3600);
        }, 700);
      } else {
        toast(`Found a shell! 🐚 (${found.size}/3)`);
      }
    });
  });

  /* bonus */
  $("#bonus-bottle").addEventListener("click", () => { $("#bonus-modal").hidden = false; });
  $("#bonus-close").addEventListener("click", () => { $("#bonus-modal").hidden = true; });

  /* letter bottle */
  $("#shore-bottle").addEventListener("click", () => {
    $("#letter").hidden = false;
    $("#bottle-stage").style.display = "none";
    setTimeout(() => $("#letter").scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" }), 80);
  });
  $("#letter-close").addEventListener("click", () => {
    $("#letter").hidden = true;
    $("#bottle-stage").style.display = "";
    $("#bottle-stage").scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
  });
}

/* sparkle burst for the sun egg */
function sparkleBurst(anchor) {
  const r = anchor.getBoundingClientRect();
  for (let i = 0; i < 14; i++) {
    const sp = document.createElement("div");
    sp.textContent = "✨";
    sp.style.cssText = `position:fixed;left:${r.left + r.width / 2}px;top:${r.top + r.height / 2}px;` +
      `z-index:50;pointer-events:none;font-size:${14 + Math.random() * 14}px;transition:all 1.1s cubic-bezier(.2,.7,.3,1);opacity:1;`;
    document.body.append(sp);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const ang = Math.random() * Math.PI * 2, dist = 70 + Math.random() * 130;
      sp.style.transform = `translate(${Math.cos(ang) * dist}px,${Math.sin(ang) * dist}px) rotate(${Math.random() * 300 - 150}deg)`;
      sp.style.opacity = "0";
    }));
    setTimeout(() => sp.remove(), 1300);
  }
}

/* the ride: a lazy back-float, or — try again — the jet ski (sample only the top curve, not the closed fill path) */
let ridePath = null;
function rideWave(jet, done) {
  if (!ridePath) {
    ridePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    ridePath.setAttribute("d", "M0 170 C140 130 280 205 420 165 C540 132 630 195 700 168");
    ridePath.setAttribute("fill", "none");
    ridePath.setAttribute("stroke", "none");
    $("#wave-svg").append(ridePath);
  }
  const path = ridePath;
  const fig = $(jet ? "#jetski" : "#floater");
  const sprayG = $("#spray");
  const L = path.getTotalLength();
  const dur = jet ? 2300 : 6500; // full throttle vs. a lazy drift
  const t0 = performance.now();
  fig.setAttribute("opacity", "1");
  function step(now) {
    const t = Math.min(1, (now - t0) / dur);
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const dist = e * L * 0.92 + L * 0.03;
    const pt = path.getPointAtLength(dist);
    const ahead = path.getPointAtLength(Math.min(L, dist + 6));
    const ang = Math.atan2(ahead.y - pt.y, ahead.x - pt.x) * 180 / Math.PI;
    const bob = jet ? Math.sin(now / 90) * 1.4 : Math.sin(now / 260) * 2.2;
    const tilt = jet
      ? ang * 0.6 - 7 + Math.sin(now / 150) * 4   // nose-up, bouncing over chop
      : ang * 0.35 + Math.sin(now / 420) * 3;      // rolling with the swell
    fig.setAttribute("transform", `translate(${pt.x},${pt.y - 2 + bob}) rotate(${tilt})`);
    const sprayRate = jet ? 0.85 : 0.12;
    if (Math.random() < sprayRate) {
      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("cx", pt.x - (jet ? 20 + Math.random() * 22 : 14 + Math.random() * 10));
      c.setAttribute("cy", pt.y + (jet ? 1 - Math.random() * 8 : 3));
      c.setAttribute("r", jet ? 1.8 + Math.random() * 3.4 : 1.2 + Math.random() * 1.8);
      c.setAttribute("fill", jet ? "rgba(255,255,255,.85)" : "rgba(255,255,255,.5)");
      sprayG.append(c);
      setTimeout(() => c.remove(), jet ? 420 : 700);
    }
    if (t < 1) requestAnimationFrame(step);
    else { fig.setAttribute("opacity", "0"); done(); }
  }
  requestAnimationFrame(step);
}
