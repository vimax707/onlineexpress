#!/usr/bin/env node
// Server lokal Kantor AI. Node murni, tanpa library tambahan.
// - Hanya mendengar di 127.0.0.1 dan menolak Host selain localhost.
// - Membaca kantor-ai/data/aktivitas.jsonl dan mengirim aksi baru ke browser lewat SSE.
// - Saat ada "Stop", Manager merangkum aksi giliran itu jadi satu laporan.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { petakan, label } = require('./pemetaan');

const PORT = Number(process.env.PORT) || 4777;
const HOST = '127.0.0.1';
const DIR = __dirname;
const LOG_FILE = process.env.KANTOR_LOG || path.join(DIR, 'data', 'aktivitas.jsonl');
const TIM_FILE = path.join(DIR, 'tim.json');
const BATAS_RIWAYAT_AKSI = 200;
const BATAS_RIWAYAT_LAPORAN = 40;
const GILIRAN_BASI_MS = 10 * 60 * 1000; // giliran tanpa kabar 10 menit dianggap berhenti

let tim = { divisi: [] };
let offset = 0;
let sisa = '';
let nomor = 0;
let aksiTerakhir = [];
let laporanTerakhir = [];
const giliran = new Map(); // sesi -> { mulai, terakhir, aksi: [] }
const klien = new Set();

function muatTim() {
  try { tim = JSON.parse(fs.readFileSync(TIM_FILE, 'utf8')); return true; }
  catch (e) { console.error('[kantor] tim.json tidak bisa dibaca:', e.message); return false; }
}

function kirim(pesan) {
  const data = `data: ${JSON.stringify(pesan)}\n\n`;
  for (const res of klien) res.write(data);
}

function namaDivisi(id) {
  const d = (tim.divisi || []).find((x) => x.id === id);
  return d ? d.nama : '—';
}

function buatLaporan(sesi, g, ts) {
  const perOrang = new Map();
  for (const a of g.aksi) {
    const kunci = a.karyawan || '?';
    if (!perOrang.has(kunci)) perOrang.set(kunci, { karyawan: kunci, divisi: a.divisi, item: new Map() });
    const it = perOrang.get(kunci).item;
    it.set(a.label, (it.get(a.label) || 0) + 1);
  }
  const baris = [...perOrang.values()].map((o) => ({
    karyawan: o.karyawan,
    divisi: namaDivisi(o.divisi),
    kerja: [...o.item.entries()].map(([l, n]) => (n > 1 ? `${l} ×${n}` : l)),
  }));
  const luar = g.aksi.filter((a) => a.luar).map((a) => ({ karyawan: a.karyawan, alasan: a.luar, label: a.label }));
  let ringkas;
  if (g.aksi.length === 0) ringkas = 'Giliran selesai tanpa aksi alat — hanya menjawab.';
  else ringkas = `Giliran selesai: ${g.aksi.length} aksi oleh ${baris.length} karyawan.` +
    (luar.length ? ` ⚠ ${luar.length} aksi berdampak di luar folder.` : '');
  return { type: 'laporan', sesi, ts, mulai: g.mulai, durasiMs: ts - g.mulai, ringkas, baris, luar };
}

// Memproses satu baris catatan. siar=false saat memutar ulang riwayat.
function proses(b, siar) {
  if (!b || typeof b !== 'object' || !b.event) return;
  const sesi = b.sesi || 'tanpa-sesi';
  const ts = Number(b.ts) || Date.now();
  if (b.event === 'UserPromptSubmit') {
    giliran.set(sesi, { mulai: ts, terakhir: ts, aksi: [] });
    if (siar) kirim({ type: 'perintah', sesi, ts });
  } else if (b.event === 'PreToolUse') {
    let g = giliran.get(sesi);
    if (!g) { g = { mulai: ts, terakhir: ts, aksi: [] }; giliran.set(sesi, g); }
    const p = petakan(tim, b);
    const a = { type: 'aksi', id: ++nomor, sesi, ts, tool: b.tool, file: b.file || null,
      label: label(b), divisi: p.divisi, karyawan: p.karyawan, luar: b.luar || null };
    g.aksi.push(a); g.terakhir = ts;
    aksiTerakhir.push(a);
    if (aksiTerakhir.length > BATAS_RIWAYAT_AKSI) aksiTerakhir.shift();
    if (siar) kirim(a);
  } else if (b.event === 'Stop') {
    const g = giliran.get(sesi) || { mulai: ts, terakhir: ts, aksi: [] };
    giliran.delete(sesi);
    const lap = buatLaporan(sesi, g, ts);
    laporanTerakhir.push(lap);
    if (laporanTerakhir.length > BATAS_RIWAYAT_LAPORAN) laporanTerakhir.shift();
    if (siar) kirim(lap);
  }
}

function bacaBaru(siar) {
  let st;
  try { st = fs.statSync(LOG_FILE); } catch (_) { return; }
  if (st.size < offset) { // file dipotong/diganti: bangun ulang dari awal
    putarUlang();
    if (siar) kirim(snapshot());
    return;
  }
  if (st.size === offset) return;
  const fd = fs.openSync(LOG_FILE, 'r');
  try {
    const len = st.size - offset;
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, offset);
    offset = st.size;
    const teks = sisa + buf.toString('utf8');
    const baris = teks.split('\n');
    sisa = baris.pop();
    for (const l of baris) {
      if (!l.trim()) continue;
      try { proses(JSON.parse(l), siar); } catch (_) { /* baris rusak dilewati */ }
    }
  } finally { fs.closeSync(fd); }
}

function putarUlang() {
  offset = 0; sisa = ''; nomor = 0; aksiTerakhir = []; laporanTerakhir = []; giliran.clear();
  bacaBaru(false);
}

function snapshot() {
  const kini = Date.now();
  const aktif = {};
  for (const [s, g] of giliran) if (kini - g.terakhir < GILIRAN_BASI_MS) aktif[s] = g;
  return { type: 'awal', tim, aksi: aksiTerakhir, laporan: laporanTerakhir, aktif, kini };
}

const STATIS = {
  '/': ['public/index.html', 'text/html; charset=utf-8'],
  '/kantor.js': ['public/kantor.js', 'text/javascript; charset=utf-8'],
  '/gaya.css': ['public/gaya.css', 'text/css; charset=utf-8'],
  '/vendor/three.module.min.js': ['public/vendor/three.module.min.js', 'text/javascript; charset=utf-8'],
  '/vendor/OrbitControls.js': ['public/vendor/OrbitControls.js', 'text/javascript; charset=utf-8'],
  '/vendor/CSS2DRenderer.js': ['public/vendor/CSS2DRenderer.js', 'text/javascript; charset=utf-8'],
};

const server = http.createServer((req, res) => {
  // Lindungi dari DNS rebinding: hanya terima Host localhost.
  const host = String(req.headers.host || '').replace(/:\d+$/, '');
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(host)) { res.writeHead(403); return res.end('Hanya untuk komputer ini.'); }
  if (req.method !== 'GET') { res.writeHead(405); return res.end(); }
  const url = req.url.split('?')[0];
  if (url === '/api/aliran') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write(`data: ${JSON.stringify(snapshot())}\n\n`);
    klien.add(res);
    req.on('close', () => klien.delete(res));
    return;
  }
  if (url === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(snapshot()));
  }
  const s = STATIS[url];
  if (!s) { res.writeHead(404); return res.end('Tidak ada.'); }
  fs.readFile(path.join(DIR, s[0]), (err, data) => {
    if (err) { res.writeHead(500); return res.end('Gagal membaca file.'); }
    res.writeHead(200, { 'Content-Type': s[1], 'Cache-Control': 'no-store' });
    res.end(data);
  });
});

muatTim();
putarUlang();
setInterval(() => bacaBaru(true), 250);
setInterval(() => { for (const r of klien) r.write(': detak\n\n'); }, 20000);
fs.watchFile(TIM_FILE, { interval: 1000 }, () => {
  if (muatTim()) { putarUlang(); kirim(snapshot()); console.log('[kantor] tim.json dimuat ulang'); }
});

const ALAMAT = `http://${HOST}:${PORT}`;
const BUKA = process.argv.includes('--buka');

// Buka browser bawaan (dipakai oleh jalankan.bat / jalankan.sh).
function bukaBrowser() {
  const { spawn } = require('child_process');
  const os = process.platform;
  const [cmd, args] = os === 'win32' ? ['cmd', ['/c', 'start', '""', ALAMAT]]
    : os === 'darwin' ? ['open', [ALAMAT]] : ['xdg-open', [ALAMAT]];
  const gagal = () => console.log(`[kantor] Buka ${ALAMAT} di browser.`);
  try {
    const c = spawn(cmd, args, { stdio: 'ignore', detached: true, windowsVerbatimArguments: os === 'win32' });
    c.on('error', gagal);
    c.unref();
  } catch (_) { gagal(); }
}

server.on('error', (e) => {
  if (e.code !== 'EADDRINUSE') { console.error('[kantor] Server gagal:', e.message); process.exit(1); }
  // Port terpakai: kalau itu Kantor AI yang sudah jalan, cukup buka halamannya.
  http.get(`${ALAMAT}/api/status`, (r) => {
    r.resume();
    if (r.statusCode === 200) {
      console.log(`[kantor] Kantor AI sudah jalan di ${ALAMAT}`);
      if (BUKA) bukaBrowser();
      setTimeout(() => process.exit(0), 300);
    } else {
      console.error(`[kantor] Port ${PORT} dipakai program lain. Coba port lain, misalnya: PORT=4778`);
      process.exit(1);
    }
  }).on('error', () => {
    console.error(`[kantor] Port ${PORT} dipakai program lain. Coba port lain, misalnya: PORT=4778`);
    process.exit(1);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`[kantor] Kantor AI jalan di ${ALAMAT}  (hanya komputer ini)`);
  console.log(`[kantor] membaca ${LOG_FILE}`);
  console.log('[kantor] Tekan Ctrl+C atau tutup jendela ini untuk mematikan.');
  if (BUKA) bukaBrowser();
});
