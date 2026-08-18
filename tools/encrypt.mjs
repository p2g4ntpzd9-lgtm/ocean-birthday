#!/usr/bin/env node
/**
 * Encrypts tools/content.source.json → content.enc.js
 * and every photo/video in assets/photos/ → <name>.enc
 * Usage: node tools/encrypt.mjs <password>
 *
 * PBKDF2(SHA-256, 210k) → AES-256-GCM.
 * Only encrypted blobs + salt/iv + the plaintext hint are published;
 * the password and the original media never leave this machine
 * (originals are kept locally but excluded by .gitignore).
 */
import { webcrypto as crypto } from "node:crypto";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const pw = process.argv[2];
if (!pw) {
  console.error("사용법: node tools/encrypt.mjs <비밀번호>");
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const content = JSON.parse(readFileSync(join(root, "tools/content.source.json"), "utf8"));
const hint = content.hint || "";

const salt = crypto.getRandomValues(new Uint8Array(16));
const keyMat = await crypto.subtle.importKey(
  "raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
const key = await crypto.subtle.deriveKey(
  { name: "PBKDF2", salt, iterations: 210000, hash: "SHA-256" },
  keyMat, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);

// ── content ──
const iv = crypto.getRandomValues(new Uint8Array(12));
const data = await crypto.subtle.encrypt(
  { name: "AES-GCM", iv }, key,
  new TextEncoder().encode(JSON.stringify(content)));

const b64 = (u8) => Buffer.from(u8).toString("base64");
writeFileSync(join(root, "content.enc.js"), `window.ENC_CONTENT = ${JSON.stringify({
  hint,
  salt: b64(salt),
  iv: b64(iv),
  data: b64(new Uint8Array(data)),
}, null, 2)};\n`);
console.log("✅ content.enc.js 생성 완료");

// ── media (photos/videos) → <name>.enc = [12-byte IV][ciphertext] ──
const photosDir = join(root, "assets/photos");
let n = 0;
for (const f of readdirSync(photosDir)) {
  if (f.endsWith(".enc") || f.startsWith(".")) continue;
  const raw = readFileSync(join(photosDir, f));
  const miv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv: miv }, key, raw);
  writeFileSync(join(photosDir, f + ".enc"),
    Buffer.concat([Buffer.from(miv), Buffer.from(new Uint8Array(ct))]));
  n++;
}
console.log(`✅ 사진/영상 ${n}개 암호화 완료 (원본은 .gitignore로 비공개 유지)`);
console.log("   비밀번호는 어떤 파일에도 저장되지 않음");
