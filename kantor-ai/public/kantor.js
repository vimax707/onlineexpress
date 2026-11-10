// Tampilan Kantor AI. Semua perubahan di layar dipicu oleh pesan dari server
// (yang berasal dari hook Claude Code, jadwal shift, atau jam komputer).
// Tidak ada aktivitas acak: kalau tidak ada pesan, kantornya diam.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/CSS2DRenderer.js';

const GILIRAN_BASI_MS = 10 * 60 * 1000;
const MAKS_BARIS = 200;

// ---------- Dasar adegan ----------
const wadah = document.getElementById('kanvas');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
wadah.appendChild(renderer.domElement);

const label2d = new CSS2DRenderer();
label2d.domElement.style.position = 'absolute';
label2d.domElement.style.inset = '0';
label2d.domElement.style.pointerEvents = 'none';
wadah.appendChild(label2d.domElement);

const adegan = new THREE.Scene();
adegan.background = new THREE.Color('#eef0f3');
const kamera = new THREE.PerspectiveCamera(40, 1, 0.1, 300);
const kontrol = new OrbitControls(kamera, renderer.domElement);
kontrol.enableDamping = true;
kontrol.maxPolarAngle = Math.PI * 0.45;
kontrol.minDistance = 4;
kontrol.maxDistance = 80;

adegan.add(new THREE.HemisphereLight('#ffffff', '#e8ebf0', 2.2));
const matahari = new THREE.DirectionalLight('#ffffff', 1.4);
matahari.position.set(10, 20, 12);
matahari.castShadow = true;
matahari.shadow.mapSize.set(2048, 2048);
matahari.shadow.radius = 4;
Object.assign(matahari.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30 });
adegan.add(matahari);

const lantai = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshStandardMaterial({ color: '#e4e6ea' }));
lantai.rotation.x = -Math.PI / 2;
lantai.receiveShadow = true;
adegan.add(lantai);

let gedung = new THREE.Group();
adegan.add(gedung);

function ukur() {
  const w = wadah.clientWidth, h = wadah.clientHeight;
  renderer.setSize(w, h);
  label2d.setSize(w, h);
  kamera.aspect = w / Math.max(h, 1);
  kamera.updateProjectionMatrix();
}
addEventListener('resize', ukur);

// ---------- Bahan ----------
const bahan = {
  meja: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }),
  kaki: new THREE.MeshStandardMaterial({ color: '#c9ced6' }),
  monitor: new THREE.MeshStandardMaterial({ color: '#2a2e35', roughness: 0.4 }),
  kulit: new THREE.MeshStandardMaterial({ color: '#f0d2b4', roughness: 0.8 }),
  kursi: new THREE.MeshStandardMaterial({ color: '#d5d9e0' }),
  dinding: new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.85 }),
  sofa: new THREE.MeshStandardMaterial({ color: '#9fb3c8', roughness: 0.9 }),
  bantal: new THREE.MeshStandardMaterial({ color: '#c7d4e2', roughness: 0.9 }),
  kayu: new THREE.MeshStandardMaterial({ color: '#d9c3a5', roughness: 0.7 }),
  hijauMeja: new THREE.MeshStandardMaterial({ color: '#2f7d5b', roughness: 0.6 }),
  daun: new THREE.MeshStandardMaterial({ color: '#7fb77e', roughness: 0.8 }),
  pot: new THREE.MeshStandardMaterial({ color: '#e7e2da' }),
  dindingVideo: new THREE.MeshStandardMaterial({ color: '#d4d8de', roughness: 0.8 }),
  bezel: new THREE.MeshStandardMaterial({ color: '#16181c', roughness: 0.3 }),
  kayuMeja: new THREE.MeshStandardMaterial({ color: '#e6cfa6', roughness: 0.65 }),
  alasMeja: new THREE.MeshStandardMaterial({ color: '#1f2228', roughness: 0.9 }),
  kursiHitam: new THREE.MeshStandardMaterial({ color: '#25282e', roughness: 0.7 }),
  dindingKontrol: new THREE.MeshStandardMaterial({ color: '#eef2ee', roughness: 0.9 }),
  tirai1: new THREE.MeshStandardMaterial({ color: '#3fc7a2', roughness: 0.95 }),
  tirai2: new THREE.MeshStandardMaterial({ color: '#56d3b2', roughness: 0.95 }),
  putih: new THREE.MeshStandardMaterial({ color: '#fafafa', roughness: 0.5 }),
  celana: new THREE.MeshStandardMaterial({ color: '#3b4252', roughness: 0.8 }),
};
const LAYAR_MATI = new THREE.Color('#1c1f24');
const LAYAR_NYALA = new THREE.Color('#8fd0ff');

function kotak(w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
function label(teks, kelas, y) {
  const el = document.createElement('div');
  el.className = kelas;
  el.textContent = teks;
  const o = new CSS2DObject(el);
  o.position.set(0, y, 0);
  return o;
}
function campur(hex, putih) { return new THREE.Color(hex).lerp(new THREE.Color('#ffffff'), putih); }

// Meja kerja tanpa orang. Layar menghadap +z (ke kamera); kursi di sisi +z.
function buatMeja(lebar = 1.4) {
  const g = new THREE.Group();
  g.add(kotak(lebar, 0.06, 0.8, bahan.meja, 0, 0.75, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1])
    g.add(kotak(0.05, 0.72, 0.05, bahan.kaki, sx * (lebar / 2 - 0.08), 0.36, sz * 0.32));
  g.add(kotak(0.06, 0.18, 0.06, bahan.kaki, 0, 0.87, -0.2));
  const casingMat = bahan.monitor.clone();
  casingMat.emissive = new THREE.Color('#000000');
  g.add(kotak(0.66, 0.42, 0.05, casingMat, 0, 1.17, -0.22));
  const lampuMat = new THREE.MeshStandardMaterial({ color: '#e5e7eb', emissive: '#000000' });
  const lampu = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 16), lampuMat);
  lampu.position.set(lebar / 2 - 0.15, 0.795, 0.25);
  g.add(lampu);
  const layarMat = new THREE.MeshStandardMaterial({ color: '#1c1f24', emissive: '#000000', roughness: 0.3 });
  const layar = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.36), layarMat);
  layar.position.set(0, 1.17, -0.193);
  g.add(layar);
  g.add(kotak(0.5, 0.08, 0.5, bahan.kursi, 0, 0.45, 0.75));
  g.add(kotak(0.5, 0.5, 0.06, bahan.kursi, 0, 0.75, 1.0));
  const meja = { grup: g, kursi: new THREE.Vector3(0, 0, 0.72) };
  meja.layar = {
    jenis: 'meja',
    set(mode) {
      if (mode === 'nyala') {
        layarMat.color.copy(LAYAR_NYALA); layarMat.emissive.copy(LAYAR_NYALA); layarMat.emissiveIntensity = 0.9;
        casingMat.emissive.copy(LAYAR_NYALA); casingMat.emissiveIntensity = 0.55;
        lampuMat.emissive.set('#22c55e'); lampuMat.emissiveIntensity = 1;
      } else if (mode === 'redup') {
        layarMat.color.set('#3b4a5c'); layarMat.emissive.copy(LAYAR_NYALA); layarMat.emissiveIntensity = 0.18;
        casingMat.emissive.copy(LAYAR_NYALA); casingMat.emissiveIntensity = 0.12;
        lampuMat.emissive.set('#000000');
      } else {
        layarMat.color.copy(LAYAR_MATI); layarMat.emissive.set('#000000'); layarMat.emissiveIntensity = 0;
        casingMat.emissive.set('#000000'); lampuMat.emissive.set('#000000');
      }
    },
  };
  return meja;
}

// Satu karakter (badan + kepala + nama kecil + gelembung kerja).
function buatOrang(teksNama, warna, kelasNama = 'nama') {
  const g = new THREE.Group();
  const badan = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.36, 4, 12), new THREE.MeshStandardMaterial({ color: warna, roughness: 0.7 }));
  badan.position.y = 0.82; badan.castShadow = true;
  const kepala = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 16), bahan.kulit);
  kepala.position.y = 1.3; kepala.castShadow = true;
  g.add(badan, kepala);
  const kaki = new THREE.Group();
  for (const sx of [-1, 1]) {
    const k = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.5, 10), bahan.celana);
    k.position.set(sx * 0.09, 0.25, 0); k.castShadow = true; kaki.add(k);
  }
  kaki.visible = false;
  g.add(kaki);
  const n = label(teksNama, kelasNama, 1.62);
  const gel = label('', 'gelembung sembunyi', 2.25);
  g.add(n, gel);
  return { grup: g, kaki, namaEl: n.element, gelembungEl: gel.element };
}

function buatRuang(judul, warna, w, d, warnaAlas) {
  const g = new THREE.Group();
  const alas = kotak(w, 0.04, d, new THREE.MeshStandardMaterial({ color: warnaAlas || campur(warna, 0.82) }), 0, 0.02, 0);
  alas.castShadow = false;
  g.add(alas);
  const t = 0.08, h = 0.55;
  g.add(kotak(w, h, t, bahan.dinding, 0, h / 2, -d / 2));
  g.add(kotak(t, h, d, bahan.dinding, -w / 2, h / 2, 0));
  g.add(kotak(t, h, d, bahan.dinding, w / 2, h / 2, 0));
  g.add(kotak(w, 0.04, t + 0.01, new THREE.MeshStandardMaterial({ color: warna }), 0, h, -d / 2));
  const p = label(judul, 'papan-ruang', 0);
  p.position.set(0, 0.05, d / 2 + 0.35);
  g.add(p);
  return g;
}

// ---------- Layar bergambar (PC & TV ruang kontrol) ----------
// Isi digambar ke <canvas> dari data asli, dan hanya digambar ulang saat ada event.
function buatKanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { c, ctx: c.getContext('2d'), tex };
}
const HURUF = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
function potong(ctx, teks, maks) {
  if (ctx.measureText(teks).width <= maks) return teks;
  while (teks.length > 1 && ctx.measureText(teks + '…').width > maks) teks = teks.slice(0, -1);
  return teks + '…';
}
function bungkus(ctx, teks, maks, batas) {
  const kata = String(teks).split(' '); const baris = []; let cur = '';
  for (const k of kata) {
    const coba = cur ? cur + ' ' + k : k;
    if (ctx.measureText(coba).width > maks && cur) { baris.push(cur); cur = k; } else cur = coba;
  }
  if (cur) baris.push(cur);
  if (baris.length > batas) { baris.length = batas; baris[batas - 1] = potong(ctx, baris[batas - 1] + ' …', maks); }
  return baris;
}
function kerangka(ctx, x, y, w, h, judul, kanan, warna, mode) {
  const s = h / 400;
  ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = warna; ctx.fillRect(x, y, w, 64 * s);
  ctx.fillStyle = '#ffffff'; ctx.font = `600 ${30 * s}px ${HURUF}`; ctx.textBaseline = 'middle';
  ctx.fillText(potong(ctx, judul, w - 190 * s), x + 18 * s, y + 33 * s);
  if (kanan) {
    ctx.font = `600 ${24 * s}px ${HURUF}`;
    const lw = ctx.measureText(kanan).width;
    ctx.fillText(kanan, x + w - lw - 18 * s, y + 33 * s);
  }
  if (mode === 'nyala' || mode === 'redup') {
    ctx.strokeStyle = mode === 'nyala' ? '#22c55e' : '#86efac';
    ctx.lineWidth = (mode === 'nyala' ? 10 : 6) * s;
    ctx.strokeRect(x + ctx.lineWidth / 2, y + ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
  }
  return s;
}
function jamPendek(ts) { return new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }); }

function gambarDivisi(ctx, x, y, w, h, d, data, mode) {
  if (!d) {
    ctx.fillStyle = '#f3f4f6'; ctx.fillRect(x, y, w, h);
    return;
  }
  const status = mode === 'nyala' ? '● AKTIF' : mode === 'redup' ? 'baru saja' : 'Diam';
  const s = kerangka(ctx, x, y, w, h, d.nama, status, d.warna || '#64748b', mode);
  ctx.textBaseline = 'alphabetic';
  const daftar = (data && data.aksi) || [];
  if (!daftar.length) {
    ctx.fillStyle = '#9ca3af'; ctx.font = `${26 * s}px ${HURUF}`;
    ctx.fillText('Belum ada aksi tercatat', x + 18 * s, y + 120 * s);
    return;
  }
  daftar.slice(0, 5).forEach((a, i) => {
    const by = y + (116 + i * 60) * s;
    ctx.fillStyle = '#6b7280'; ctx.font = `${22 * s}px ${HURUF}`;
    ctx.fillText(jamPendek(a.ts), x + 18 * s, by);
    ctx.fillStyle = '#111827'; ctx.font = `600 ${24 * s}px ${HURUF}`;
    const siapa = a.asli ? `${a.karyawan} (tugas ${a.asli})` : (a.karyawan || '?');
    ctx.fillText(potong(ctx, siapa, w - 120 * s), x + 100 * s, by);
    ctx.fillStyle = a.luar ? '#b91c1c' : '#374151'; ctx.font = `${23 * s}px ${HURUF}`;
    ctx.fillText(potong(ctx, (a.luar ? '⚠ ' : '') + a.label, w - 120 * s), x + 100 * s, by + 27 * s);
  });
}

function gambarShift(ctx, x, y, w, h, tugas, info, pengawas) {
  const judul = tugas ? `Shift ${tugas.shift} · ${tugas.hari}` : 'Jadwal shift';
  const s = kerangka(ctx, x, y, w, h, judul, tugas ? `${tugas.mulai}–${tugas.selesai}` : '', '#334155', 'mati');
  ctx.textBaseline = 'alphabetic';
  const baris = (lbl, isi, by, warna = '#111827') => {
    ctx.fillStyle = '#6b7280'; ctx.font = `${23 * s}px ${HURUF}`; ctx.fillText(lbl, x + 18 * s, by);
    ctx.fillStyle = warna; ctx.font = `600 ${30 * s}px ${HURUF}`; ctx.fillText(potong(ctx, isi, w - 220 * s), x + 200 * s, by);
  };
  if (!tugas) {
    ctx.fillStyle = '#6b7280'; ctx.font = `${26 * s}px ${HURUF}`;
    ctx.fillText('Ruang kontrol belum diatur', x + 18 * s, y + 120 * s);
    return;
  }
  baris('Penanggung jawab', tugas.pj || '— kosong —', y + 120 * s, tugas.pj ? '#111827' : '#b91c1c');
  baris('Operator', tugas.operator || '— kosong —', y + 170 * s, tugas.operator ? '#111827' : '#b91c1c');
  if (pengawas) baris('Pengawas', pengawas, y + 220 * s);
  const b = tugas.berikutnya;
  if (b) {
    ctx.fillStyle = '#6b7280'; ctx.font = `${22 * s}px ${HURUF}`;
    ctx.fillText(potong(ctx, `Berikutnya: ${b.shift} ${b.mulai} · ${b.pj || '-'} + ${b.operator || '-'}`, w - 36 * s), x + 18 * s, y + 290 * s);
  }
  const n = info && info.jumlahPeringatan;
  ctx.fillStyle = n ? '#b45309' : '#16a34a'; ctx.font = `${22 * s}px ${HURUF}`;
  ctx.fillText(n ? `⚠ ${n} catatan pada ${info.sumber || 'jadwal'}` : `Jadwal: ${(info && info.sumber) || '-'}`, x + 18 * s, y + 350 * s);
}

function gambarLaporan(ctx, x, y, w, h, lap, namaManager) {
  const s = kerangka(ctx, x, y, w, h, `Laporan ${namaManager}`, lap ? jamPendek(lap.ts) : '', '#7c3aed', 'mati');
  ctx.textBaseline = 'alphabetic';
  if (!lap) {
    ctx.fillStyle = '#9ca3af'; ctx.font = `${26 * s}px ${HURUF}`;
    ctx.fillText('Belum ada laporan', x + 18 * s, y + 120 * s);
    return;
  }
  ctx.fillStyle = '#111827'; ctx.font = `600 ${25 * s}px ${HURUF}`;
  let by = y + 112 * s;
  for (const l of bungkus(ctx, lap.ringkas, w - 36 * s, 2)) { ctx.fillText(l, x + 18 * s, by); by += 32 * s; }
  ctx.font = `${22 * s}px ${HURUF}`;
  for (const b of lap.baris.slice(0, 3)) {
    by += 8 * s;
    ctx.fillStyle = '#374151';
    ctx.fillText(potong(ctx, `${b.karyawan}: ${b.kerja.join(', ')}`, w - 36 * s), x + 18 * s, by);
    by += 28 * s;
  }
  if (lap.luar.length) {
    ctx.fillStyle = '#b91c1c'; ctx.font = `600 ${22 * s}px ${HURUF}`;
    ctx.fillText(potong(ctx, `⚠ Luar folder: ${lap.luar.map((l) => `${l.karyawan} ${l.alasan}`).join(', ')}`, w - 36 * s), x + 18 * s, y + h - 24 * s);
  }
}

// ---------- Status (semuanya dari event server) ----------
let tim = { divisi: [] };
let tugasKini = null;
let infoJadwal = null;
let laporanAkhir = null;
const dataDivisi = new Map(); // id divisi -> { aksi: [...] }
const giliran = new Map();     // sesi -> { layar:Set, aktif:Set, orangAktif, terakhir, jumlah }

// Objek adegan
let orang = new Map();   // nama -> { grup, namaEl, gelembungEl, rumah:{pos, layar} }
let rk = null;           // { pcs:[...], kursiOperator, kursiPJ, kursiPengawas, layarPengawas, tempatIstirahat:[], tv65, tv43 }
let mejaManager = null, mejaBos = null, orangManager = null, orangBos = null;
let warnaDivisi = new Map();
let tandaTim = '';

function divisiKePc(id) {
  const i = (tim.divisi || []).findIndex((d) => d.id === id);
  return i < 0 ? 3 : Math.min(i, 3);
}

// ---------- Ruang kontrol ----------
// Satu komputer desktop: monitor di atas meja, keyboard, dan CPU di bawah meja
// dengan 3 kipas RGB. Kipas & bingkai monitor hanya menyala saat PC-nya aktif.
const WARNA_KIPAS = ['#ff3cac', '#2bd2ff', '#ffd60a'];
function buatPc(i) {
  const g = new THREE.Group();
  const casingMat = bahan.monitor.clone(); casingMat.emissive = new THREE.Color('#000000');
  g.add(kotak(0.66, 0.4, 0.04, casingMat, 0, 1.17, -0.15));
  g.add(kotak(0.05, 0.2, 0.05, bahan.monitor, 0, 0.88, -0.18));
  g.add(kotak(0.26, 0.02, 0.17, bahan.monitor, 0, 0.785, -0.17));
  const kv = buatKanvas(640, 400);
  const layar = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.36), new THREE.MeshBasicMaterial({ map: kv.tex, toneMapped: false }));
  layar.position.set(0, 1.17, -0.128);
  g.add(layar);
  g.add(kotak(0.86, 0.006, 0.34, bahan.alasMeja, 0, 0.778, 0.14)); // alas meja hitam
  g.add(kotak(0.46, 0.02, 0.15, bahan.monitor, -0.05, 0.79, 0.14)); // keyboard
  g.add(kotak(0.06, 0.025, 0.1, bahan.monitor, 0.3, 0.79, 0.15));   // mouse
  // CPU di bawah meja, kipas menghadap depan
  g.add(kotak(0.22, 0.48, 0.44, bahan.monitor, 0.24, 0.24, 0.0));
  const kipasMat = WARNA_KIPAS.map(() => new THREE.MeshStandardMaterial({ color: '#3a3f47', emissive: '#000000' }));
  kipasMat.forEach((m, k) => {
    const cincin = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.013, 8, 24), m);
    cincin.position.set(0.24, 0.38 - k * 0.13, 0.225);
    g.add(cincin);
  });
  const pc = { i, grup: g, kv, mode: 'mati' };
  pc.set = (mode) => {
    pc.mode = mode;
    casingMat.emissive.copy(mode === 'mati' ? new THREE.Color('#000000') : LAYAR_NYALA);
    casingMat.emissiveIntensity = mode === 'nyala' ? 0.5 : mode === 'redup' ? 0.12 : 0;
    kipasMat.forEach((m, k) => {
      if (mode === 'mati') { m.color.set('#3a3f47'); m.emissive.set('#000000'); }
      else { m.color.set(WARNA_KIPAS[k]); m.emissive.set(WARNA_KIPAS[k]); m.emissiveIntensity = mode === 'nyala' ? 1.3 : 0.35; }
    });
    gambarPc(i); gambarTv();
  };
  pc.jenis = 'pc';
  return pc;
}

function gambarPc(i) {
  if (!rk) return;
  const pc = rk.pcs[i], { ctx, c, tex } = pc.kv;
  if (i < 4) {
    const d = (tim.divisi || [])[i];
    gambarDivisi(ctx, 0, 0, c.width, c.height, d, d && dataDivisi.get(d.id), pc.mode);
  } else if (i === 4) gambarShift(ctx, 0, 0, c.width, c.height, tugasKini, infoJadwal, tim.ruangKontrol && tim.ruangKontrol.pengawas);
  else gambarLaporan(ctx, 0, 0, c.width, c.height, laporanAkhir, (tim.manager && tim.manager.nama) || 'Manager');
  tex.needsUpdate = true;
}

// TV 65" menampilkan PC 1–4 (2×2), TV 43" menampilkan PC 5–6 (1×2).
function gambarTv() {
  if (!rk) return;
  const salin = (tv, daftar, kol) => {
    const { ctx, c, tex } = tv.kv;
    ctx.fillStyle = '#0f1115'; ctx.fillRect(0, 0, c.width, c.height);
    const gap = 10, bar = Math.ceil(daftar.length / kol);
    const w = (c.width - gap * (kol + 1)) / kol, h = (c.height - gap * (bar + 1)) / bar;
    daftar.forEach((i, n) => {
      // Pertahankan perbandingan layar PC (16:10) di dalam petak TV.
      const sumber = rk.pcs[i].kv.c, rasio = sumber.width / sumber.height;
      const pw = Math.min(w, h * rasio), ph = pw / rasio;
      const x = gap + (n % kol) * (w + gap) + (w - pw) / 2, y = gap + Math.floor(n / kol) * (h + gap) + (h - ph) / 2;
      ctx.drawImage(sumber, x, y, pw, ph);
      ctx.fillStyle = 'rgba(15,17,21,.7)'; ctx.fillRect(x + pw - 74, y + ph - 30, 70, 26);
      ctx.fillStyle = '#e5e7eb'; ctx.font = `600 18px ${HURUF}`; ctx.textBaseline = 'middle';
      ctx.fillText(`PC ${i + 1}`, x + pw - 64, y + ph - 17);
    });
    tex.needsUpdate = true;
  };
  salin(rk.tv65, [0, 1, 2, 3], 2);
  salin(rk.tv43, [4, 5], 2);
}

function taruh(obj, x, y, z) { obj.position.set(x, y, z); gedung.add(obj); return obj; }

// Setiap pembangun ruang: { w, d, bangun(x0, z0) } — x0/z0 = titik tengah ruang.
function kursiKantor(x, z) {
  const g = new THREE.Group();
  g.add(kotak(0.5, 0.08, 0.5, bahan.kursiHitam, 0, 0.48, 0));
  g.add(kotak(0.46, 0.55, 0.06, bahan.kursiHitam, 0, 0.82, 0.25));
  g.add(kotak(0.05, 0.4, 0.05, bahan.kaki, 0, 0.25, 0));
  g.add(kotak(0.6, 0.03, 0.06, bahan.kursiHitam, 0, 0.04, 0));
  g.add(kotak(0.06, 0.03, 0.6, bahan.kursiHitam, 0, 0.04, 0));
  g.position.set(x, 0, z);
  gedung.add(g);
}

function mejaKayu(x, z, panjang) {
  gedung.add(kotak(panjang, 0.05, 0.8, bahan.kayuMeja, x, 0.75, z));
  for (const sx of [-1, 1]) for (const sz of [-1, 1])
    gedung.add(kotak(0.07, 0.72, 0.07, bahan.kayuMeja, x + sx * (panjang / 2 - 0.06), 0.36, z + sz * 0.33));
  gedung.add(kotak(panjang - 0.1, 0.06, 0.04, bahan.kayuMeja, x, 0.18, z - 0.33)); // palang bawah
}

function buatTv(lebar, tinggi, judul) {
  const g = new THREE.Group();
  g.add(kotak(lebar + 0.05, tinggi + 0.05, 0.05, bahan.bezel, 0, 0, 0));
  const kv = buatKanvas(1280, Math.round(1280 * tinggi / lebar));
  const layar = new THREE.Mesh(new THREE.PlaneGeometry(lebar, tinggi), new THREE.MeshBasicMaterial({ map: kv.tex, toneMapped: false }));
  layar.position.z = 0.027;
  g.add(layar);
  const l = label(judul, 'papan-tv', 0);
  l.position.set(0, tinggi / 2 + 0.12, 0.05);
  g.add(l);
  return { grup: g, kv };
}

// Ruang kontrol, meniru ruang kontrol asli: dinding jendela bertirai hijau mint,
// TV 65" di tengah, TV 43" di kiri (berdiri di tiang), meja kayu panjang dengan
// 6 PC berjajar, 2 kursi petugas, meja pengawas di belakang.
function pembangunKontrol(cfg) {
  const w = 13.5, d = 6.4;
  return { w, d, bangun(x0, z0) {
    taruh(buatRuang(cfg.nama || 'Ruang Kontrol', '#0ea5e9', w, d, '#f6f7f5'), x0, 0, z0);
    const belakang = z0 - d / 2;
    // dinding tinggi + jendela bertirai
    gedung.add(kotak(w, 2.9, 0.1, bahan.dindingKontrol, x0, 1.45, belakang));
    const lebarTirai = 9.0, nPanel = 8;
    for (let k = 0; k < nPanel; k++) {
      const pw = lebarTirai / nPanel;
      gedung.add(kotak(pw + 0.02, 1.95, 0.05, k % 2 ? bahan.tirai1 : bahan.tirai2,
        x0 - lebarTirai / 2 + pw * (k + 0.5), 1.72, belakang + 0.07 + (k % 2) * 0.03));
    }
    gedung.add(kotak(lebarTirai + 0.3, 0.04, 0.04, bahan.kaki, x0, 2.72, belakang + 0.1)); // rel tirai
    gedung.add(kotak(1.0, 0.3, 0.24, bahan.putih, x0 - w / 2 + 0.9, 2.45, belakang + 0.18)); // AC
    // rak jaringan di pojok kanan
    gedung.add(kotak(0.6, 1.9, 0.6, bahan.monitor, x0 + w / 2 - 0.6, 0.95, belakang + 0.45));

    // TV 65" di tengah, TV 43" di kiri pada tiang
    const tv65 = buatTv(1.44, 0.81, 'TV 65" · PC 1–4');
    tv65.grup.position.set(x0, 1.95, belakang + 0.14);
    const tv43 = buatTv(0.95, 0.534, 'TV 43" · PC 5–6');
    tv43.grup.position.set(x0 - 2.55, 1.72, belakang + 0.55);
    gedung.add(tv65.grup, tv43.grup);
    gedung.add(kotak(0.06, 1.45, 0.06, bahan.monitor, x0 - 2.55, 0.73, belakang + 0.5));
    gedung.add(kotak(0.55, 0.04, 0.45, bahan.monitor, x0 - 2.55, 0.02, belakang + 0.5));

    // 3 meja kayu berjajar, 6 PC
    const zMeja = belakang + 1.25, jarak = 1.25;
    for (const mx of [-2.5, 0, 2.5]) mejaKayu(x0 + mx, zMeja, 2.5);
    const pcs = [];
    for (let i = 0; i < 6; i++) {
      const pc = buatPc(i);
      pc.grup.position.set(x0 + (i - 2.5) * jarak, 0, zMeja);
      const t = label(`PC ${i + 1}`, 'papan-pc', 0);
      t.position.set(0, 0.88, 0.32);
      pc.grup.add(t);
      gedung.add(pc.grup);
      pcs.push(pc);
    }
    // 2 kursi petugas: operator (dekat PC 2–3), PJ (dekat PC 4–5)
    const zKursi = zMeja + 0.75;
    kursiKantor(x0 - 1.25, zKursi); kursiKantor(x0 + 1.25, zKursi);
    const kursiOperator = new THREE.Vector3(x0 - 1.25, 0, zKursi - 0.03);
    const kursiPJ = new THREE.Vector3(x0 + 1.25, 0, zKursi - 0.03);
    // meja pengawas di belakang petugas
    const mp = buatMeja(1.4);
    mp.grup.position.set(x0, 0, z0 + d / 2 - 1.55);
    gedung.add(mp.grup);
    rk = { pcs, tv65, tv43, kursiOperator, kursiPJ,
      kursiPengawas: mp.kursi.clone().add(mp.grup.position), layarPengawas: mp.layar, tempatIstirahat: [] };
  } };
}

function sofa(x, z, n, putar, tempat) {
  const g = new THREE.Group();
  const p = n * 0.62;
  g.add(kotak(p + 0.2, 0.38, 0.75, bahan.sofa, 0, 0.19, 0));
  g.add(kotak(p + 0.2, 0.55, 0.18, bahan.sofa, 0, 0.55, -0.3));
  for (const sx of [-1, 1]) g.add(kotak(0.12, 0.5, 0.75, bahan.sofa, sx * (p / 2 + 0.06), 0.3, 0));
  for (let k = 0; k < n; k++) g.add(kotak(0.56, 0.08, 0.55, bahan.bantal, -p / 2 + 0.31 + k * 0.62, 0.42, 0.05));
  g.position.set(x, 0, z); g.rotation.y = putar;
  gedung.add(g);
  for (let k = 0; k < n; k++) {
    const v = new THREE.Vector3(-p / 2 + 0.31 + k * 0.62, -0.03, 0.08).applyAxisAngle(new THREE.Vector3(0, 1, 0), putar);
    tempat.push({ pos: v.add(g.position), berdiri: false, ruang: 'istirahat' });
  }
}
function tanaman(x, z) {
  gedung.add(kotak(0.3, 0.35, 0.3, bahan.pot, x, 0.18, z));
  const daun = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), bahan.daun);
  daun.position.set(x, 0.62, z); daun.castShadow = true;
  gedung.add(daun);
}

const tempatIstirahat = [], tempatRekreasi = [];

function pembangunIstirahat(judul) {
  const w = 6.6, d = 4.4;
  return { w, d, bangun(x0, z0) {
    taruh(buatRuang(judul, '#22c55e', w, d), x0, 0, z0);
    sofa(x0 - 0.6, z0 - 1.45, 3, 0, tempatIstirahat);
    sofa(x0 + 2.45, z0 + 0.05, 3, -Math.PI / 2, tempatIstirahat);
    gedung.add(kotak(1.1, 0.06, 0.6, bahan.kayu, x0 - 0.5, 0.4, z0 - 0.3));
    gedung.add(kotak(0.9, 0.36, 0.4, bahan.kayu, x0 - 0.5, 0.19, z0 - 0.3));
    gedung.add(kotak(0.08, 0.1, 0.08, bahan.pot, x0 - 0.7, 0.48, z0 - 0.3));
    for (const bx of [-2.0, -0.6]) {
      const bb = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 12), bahan.bantal);
      bb.scale.set(1, 0.6, 1); bb.position.set(x0 + bx, 0.2, z0 + 1.1); bb.castShadow = true;
      gedung.add(bb);
      tempatIstirahat.push({ pos: new THREE.Vector3(x0 + bx, -0.18, z0 + 1.1), berdiri: false, ruang: 'istirahat' });
    }
    tanaman(x0 - w / 2 + 0.4, z0 - d / 2 + 0.4);
  } };
}

function pembangunRekreasi(judul) {
  const w = 6.2, d = 4.4;
  return { w, d, bangun(x0, z0) {
    taruh(buatRuang(judul, '#f59e0b', w, d), x0, 0, z0);
    // meja pingpong + 2 pemain berdiri di ujungnya
    const px = x0 - 0.6, pz = z0 - 0.1;
    gedung.add(kotak(1.6, 0.05, 0.9, bahan.hijauMeja, px, 0.76, pz));
    gedung.add(kotak(0.02, 0.12, 0.9, bahan.bantal, px, 0.84, pz));
    for (const sx of [-1, 1]) for (const sz of [-1, 1])
      gedung.add(kotak(0.05, 0.74, 0.05, bahan.kaki, px + sx * 0.72, 0.37, pz + sz * 0.38));
    tempatRekreasi.push({ pos: new THREE.Vector3(px - 1.15, 0, pz), berdiri: true, ruang: 'rekreasi' });
    tempatRekreasi.push({ pos: new THREE.Vector3(px + 1.15, 0, pz), berdiri: true, ruang: 'rekreasi' });
    // bangku penonton
    gedung.add(kotak(1.4, 0.08, 0.45, bahan.kayu, x0 + 2.0, 0.42, z0 + 1.3));
    for (const sx of [-1, 1]) gedung.add(kotak(0.08, 0.4, 0.4, bahan.kayu, x0 + 2.0 + sx * 0.6, 0.2, z0 + 1.3));
    for (const bx of [-0.35, 0.35]) tempatRekreasi.push({ pos: new THREE.Vector3(x0 + 2.0 + bx, 0, z0 + 1.32), berdiri: false, ruang: 'rekreasi' });
    // mesin minuman
    gedung.add(kotak(0.8, 1.7, 0.6, new THREE.MeshStandardMaterial({ color: '#ef4444', roughness: 0.5 }), x0 + 2.4, 0.85, z0 - d / 2 + 0.5));
    gedung.add(kotak(0.55, 0.9, 0.02, bahan.putih, x0 + 2.4, 1.05, z0 - d / 2 + 0.81));
    tanaman(x0 - w / 2 + 0.4, z0 - d / 2 + 0.4);
    tanaman(x0 + w / 2 - 0.4, z0 + d / 2 - 0.5);
  } };
}

function pembangunDivisi(d, pengawas) {
  const JX = 2.3, JZ = 2.7;
  const staf = (d.karyawan || []).filter((k) => k.nama !== pengawas);
  const n = Math.max(staf.length, 1);
  const kol = Math.min(3, n), bar = Math.ceil(n / 3);
  const w = kol * JX + 1.2, dd = bar * JZ + 1.0;
  const warna = d.warna || '#94a3b8';
  warnaDivisi.set(d.id, warna);
  return { w, d: dd, bangun(cx, cz) {
    taruh(buatRuang(d.nama, warna, w, dd), cx, 0, cz);
    staf.forEach((k, j) => {
      const c = j % 3, b = Math.floor(j / 3);
      const kolBaris = Math.min(kol, staf.length - b * 3);
      const m = buatMeja();
      m.grup.position.set(cx + (c - (kolBaris - 1) / 2) * JX, 0, cz - dd / 2 + 0.9 + b * JZ);
      gedung.add(m.grup);
      const o = buatOrang(k.nama, campur(warna, 0.15).getStyle());
      o.rumah = { pos: m.kursi.clone().add(m.grup.position), layar: m.layar };
      o.divisi = d.id;
      gedung.add(o.grup);
      orang.set(k.nama, o);
    });
  } };
}

function pembangunBos(t) {
  const w = 7.4, d = 3.6;
  return { w, d, bangun(x0, z0) {
    taruh(buatRuang('Ruang Bos', '#64748b', w, d), x0, 0, z0);
    const bos = t.bos || { nama: 'Bos' };
    mejaBos = buatMeja(1.96);
    mejaBos.grup.position.set(x0 - 1.6, 0, z0 - 0.9);
    orangBos = buatOrang(`${bos.nama} (kamu)`, '#334155', 'nama bos');
    orangBos.grup.position.copy(mejaBos.kursi).add(mejaBos.grup.position);
    const man = t.manager || { nama: 'Manager' };
    mejaManager = buatMeja();
    mejaManager.grup.position.set(x0 + 1.9, 0, z0 - 0.9);
    orangManager = buatOrang(`${man.nama} · ${man.peran || 'Manager'}`, '#8b5cf6');
    orangManager.kursi = mejaManager.kursi.clone().add(mejaManager.grup.position);
    orangManager.grup.position.copy(orangManager.kursi);
    gedung.add(mejaBos.grup, orangBos.grup, mejaManager.grup, orangManager.grup);
  } };
}

// ---------- Bangun kantor dari tim.json ----------
// Susunan ruang diatur di tim.json -> "tataLetak": daftar baris (belakang ke depan),
// tiap baris berisi id ruang: id divisi, "kontrol", "istirahat", "rekreasi", "bos".
// Ruang yang tidak disebut ditaruh di baris tambahan, jadi tidak ada yang hilang.
function bangunKantor(t) {
  const tanda = JSON.stringify(t);
  if (tanda === tandaTim) return;
  tandaTim = tanda;
  adegan.remove(gedung);
  gedung.traverse((o) => { if (o.element) o.element.remove(); });
  gedung = new THREE.Group();
  adegan.add(gedung);
  orang = new Map(); warnaDivisi = new Map(); rk = null;
  tempatIstirahat.length = 0; tempatRekreasi.length = 0;

  const cfgRk = t.ruangKontrol || null;
  const pengawas = cfgRk && cfgRk.pengawas;
  const ruang = new Map();
  for (const d of t.divisi || []) ruang.set(d.id, pembangunDivisi(d, pengawas));
  if (cfgRk) {
    ruang.set('kontrol', pembangunKontrol(cfgRk));
    ruang.set('istirahat', pembangunIstirahat(cfgRk.ruangIstirahat || 'Ruang Istirahat'));
    ruang.set('rekreasi', pembangunRekreasi(cfgRk.ruangRekreasi || 'Ruang Rekreasi'));
  }
  ruang.set('bos', pembangunBos(t));

  const baris = [], dipakai = new Set();
  for (const row of Array.isArray(t.tataLetak) ? t.tataLetak : []) {
    const r = (Array.isArray(row) ? row : []).filter((id) => ruang.has(id) && !dipakai.has(id));
    r.forEach((id) => dipakai.add(id));
    if (r.length) baris.push(r);
  }
  const sisa = [...ruang.keys()].filter((id) => !dipakai.has(id) && id !== 'bos');
  for (let i = 0; i < sisa.length; i += 3) baris.push(sisa.slice(i, i + 3));
  if (!dipakai.has('bos')) baris.push(['bos']);

  const JARAK_X = 1.6, JARAK_Z = 2.3;
  let z = 0;
  for (const row of baris) {
    const rs = row.map((id) => ruang.get(id));
    const lebar = rs.reduce((a, r) => a + r.w, 0) + JARAK_X * (rs.length - 1);
    const dalam = Math.max(...rs.map((r) => r.d));
    let x = -lebar / 2;
    for (const r of rs) { r.bangun(x + r.w / 2, z + r.d / 2); x += r.w + JARAK_X; }
    z += dalam + JARAK_Z;
  }

  if (cfgRk && rk) {
    rk.tempatIstirahat = [...tempatRekreasi.filter((t) => t.berdiri), ...tempatIstirahat, ...tempatRekreasi.filter((t) => !t.berdiri)];
    if (pengawas) {
      const d = (t.divisi || []).find((x) => (x.karyawan || []).some((k) => k.nama === pengawas));
      const o = buatOrang(`${pengawas} · Pengawas`, campur((d && d.warna) || '#0ea5e9', 0.15).getStyle());
      o.rumah = { pos: rk.kursiPengawas, layar: rk.layarPengawas };
      o.divisi = d && d.id;
      gedung.add(o.grup);
      orang.set(pengawas, o);
    }
  }

  // Pusatkan kantor di titik asal supaya bayangan & kamera pas.
  const kotakSemua = new THREE.Box3().setFromObject(gedung);
  const pusat = kotakSemua.getCenter(new THREE.Vector3());
  gedung.position.set(-pusat.x, 0, -pusat.z);
  gedung.updateMatrixWorld(true);

  pasKamera();
  aturTempat();
  if (rk) { for (let i = 0; i < 6; i++) gambarPc(i); gambarTv(); }
}

// Kamera menampung seluruh kantor, menghitung lebar & dalam terhadap sudut pandang.
function pasKamera() {
  const kotakSemua = new THREE.Box3().setFromObject(gedung);
  if (kotakSemua.isEmpty()) return;
  const pusat = kotakSemua.getCenter(new THREE.Vector3());
  const ukuran = kotakSemua.getSize(new THREE.Vector3());
  const arah = new THREE.Vector3(0, 0.82, 0.57).normalize();
  const vfov = THREE.MathUtils.degToRad(kamera.fov);
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * kamera.aspect);
  // Dalam ruangan terlihat memendek karena kamera miring; lebar tidak.
  const jarakLebar = (ukuran.x / 2) / Math.tan(hfov / 2);
  const jarakDalam = (ukuran.z * arah.y / 2) / Math.tan(vfov / 2);
  const jarak = Math.max(jarakLebar, jarakDalam) * 1.08 + 2;
  kontrol.target.copy(pusat).setY(0);
  kamera.position.copy(kontrol.target).addScaledVector(arah, jarak);
  kontrol.maxDistance = jarak * 1.6;
  kontrol.update();
}

// Tempatkan karyawan sesuai shift yang sedang berjalan.
function aturTempat() {
  const cfg = tim.ruangKontrol;
  const modeShift = !!(cfg && rk && tugasKini && (tugasKini.pj || tugasKini.operator));
  let slot = 0;
  for (const [nama, o] of orang) {
    let pos = o.rumah.pos, peran = '', di = 'rumah', berdiri = false;
    if (cfg && nama === cfg.pengawas) peran = '';
    else if (modeShift && (cfg.operator || []).includes(nama)) {
      if (nama === tugasKini.operator) { pos = rk.kursiOperator; peran = 'Operator'; di = 'kontrol'; }
      else if (nama === tugasKini.pj) { pos = rk.kursiPJ; peran = 'PJ'; di = 'kontrol'; }
      else if (rk.tempatIstirahat.length) {
        const t = rk.tempatIstirahat[slot % rk.tempatIstirahat.length]; slot++;
        pos = t.pos; berdiri = t.berdiri; di = t.ruang;
      }
    }
    o.grup.position.copy(pos);
    o.kaki.visible = berdiri;
    o.di = di;
    if (!(cfg && nama === cfg.pengawas)) o.namaEl.textContent = peran ? `${nama} · ${peran}` : nama;
    o.namaEl.classList.toggle('istirahat', di === 'istirahat' || di === 'rekreasi');
  }
}

// ---------- Nyala/padam karena aksi ----------
function gelembung(o, teks, luar) {
  if (!o) return;
  o.gelembungEl.textContent = teks || '';
  o.gelembungEl.classList.toggle('sembunyi', !teks);
  o.gelembungEl.classList.toggle('luar', !!luar);
  o.namaEl.classList.toggle('aktif', !!teks);
}

function layarUntuk(a) {
  const hasil = new Set();
  if (rk && a.divisi) hasil.add(rk.pcs[divisiKePc(a.divisi)]); // ruang kontrol memantau semua divisi
  const o = orang.get(a.karyawan);
  if (o && o.di === 'rumah') hasil.add(o.rumah.layar);           // meja sendiri / meja pengawas
  return hasil;
}

function catatDivisi(a) {
  if (!a.divisi) return;
  if (!dataDivisi.has(a.divisi)) dataDivisi.set(a.divisi, { aksi: [] });
  const d = dataDivisi.get(a.divisi);
  d.aksi.unshift(a);
  if (d.aksi.length > 5) d.aksi.length = 5;
}

function terapkanAksi(a, catat = true) {
  let g = giliran.get(a.sesi);
  if (!g) { g = { layar: new Set(), aktif: new Set(), orangAktif: null, terakhir: a.ts, jumlah: 0 }; giliran.set(a.sesi, g); }
  if (catat) catatDivisi(a);
  const baru = layarUntuk(a);
  for (const l of g.aktif) if (!baru.has(l)) l.set('redup');
  for (const l of baru) { l.set('nyala'); g.layar.add(l); }
  if (rk && !baru.has(rk.pcs[divisiKePc(a.divisi)])) gambarPc(divisiKePc(a.divisi));
  g.aktif = baru;
  if (g.orangAktif && g.orangAktif !== a.karyawan) gelembung(orang.get(g.orangAktif), '');
  const tugasAsli = a.asli ? ` (tugas ${a.asli})` : '';
  gelembung(orang.get(a.karyawan), (a.luar ? '⚠ ' : '') + a.label + tugasAsli, a.luar);
  g.orangAktif = a.karyawan; g.terakhir = a.ts; g.jumlah++;
}

function tutupGiliran(sesi) {
  const g = giliran.get(sesi);
  if (!g) return;
  giliran.delete(sesi);
  const masihDipakai = new Set();
  for (const h of giliran.values()) for (const l of h.layar) masihDipakai.add(l);
  for (const l of g.layar) if (!masihDipakai.has(l)) l.set('mati');
  let orangLain = false;
  for (const h of giliran.values()) if (h.orangAktif === g.orangAktif) orangLain = true;
  if (g.orangAktif && !orangLain) gelembung(orang.get(g.orangAktif), '');
}

function perbaruiStatus(teks, kelas) {
  const elS = document.getElementById('status');
  if (teks) { elS.className = 'status ' + kelas; elS.querySelector('b').textContent = teks; return; }
  let n = 0;
  for (const g of giliran.values()) n += g.jumlah;
  if (giliran.size) { elS.className = 'status kerja'; elS.querySelector('b').textContent = `Bekerja · ${n} aksi giliran ini`; }
  else { elS.className = 'status diam'; elS.querySelector('b').textContent = 'Diam: tidak ada pekerjaan'; }
}

function perbaruiShift() {
  const elS = document.getElementById('shift');
  const t = tugasKini;
  if (!tim.ruangKontrol || !t) { elS.hidden = true; return; }
  elS.hidden = false;
  elS.querySelector('b').textContent = `Shift ${t.shift} ${t.mulai}–${t.selesai} · PJ ${t.pj || '—'} · Operator ${t.operator || '—'}`;
  const kotakJ = document.getElementById('kotak-jadwal');
  const daftar = document.getElementById('daftar-jadwal');
  const p = (infoJadwal && infoJadwal.peringatan) || [];
  kotakJ.hidden = !p.length;
  daftar.replaceChildren(...p.map((x) => el('li', '', x)));
  if (infoJadwal && infoJadwal.jumlahPeringatan > p.length) daftar.append(el('li', '', `… dan ${infoJadwal.jumlahPeringatan - p.length} lagi`));
  document.getElementById('sumber-jadwal').textContent = infoJadwal && infoJadwal.sumber ? `· ${infoJadwal.sumber}` : '';
}

// ---------- Manager lapor ke Bos (dipicu event Stop) ----------
let jalan = null;
function managerLapor(lap) {
  if (!orangManager || !orangBos) return;
  const asal = orangManager.kursi.clone();
  const tujuan = orangBos.grup.position.clone().add(new THREE.Vector3(1.0, 0, 0.6));
  gelembung(orangManager, 'menyusun laporan…');
  jalan = { dari: asal, ke: tujuan, mulai: performance.now(), durasi: 1400, lalu: () => {
    gelembung(orangManager, (lap.luar.length ? '⚠ lapor: ' : 'lapor: ') + lap.ringkas, lap.luar.length);
    setTimeout(() => {
      jalan = { dari: tujuan, ke: asal, mulai: performance.now(), durasi: 1400, lalu: () => gelembung(orangManager, '') };
    }, 5000);
  } };
}

// ---------- Panel kanan ----------
const daftarAksi = document.getElementById('daftar-aksi');
const daftarLaporan = document.getElementById('daftar-laporan');
const jam = (ts) => new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
let totalAksi = 0;

function el(tag, kelas, teks) {
  const e = document.createElement(tag);
  if (kelas) e.className = kelas;
  if (teks != null) e.textContent = teks;
  return e;
}
function buangKosong(ol) { const k = ol.querySelector('.kosong'); if (k) k.remove(); }
function batasi(ol) { while (ol.children.length > MAKS_BARIS) ol.lastChild.remove(); }

function barisAksi(a, baru) {
  buangKosong(daftarAksi);
  const li = el('li', 'aksi' + (baru ? ' baru' : ''));
  const t = el('time', '', jam(a.ts)); t.dateTime = new Date(a.ts).toISOString();
  const siapa = el('span', 'siapa', a.karyawan || '?');
  siapa.style.setProperty('--warna', warnaDivisi.get(a.divisi) || '#9ca3af');
  if (a.asli) siapa.append(el('small', 'tugas-asli', ` tugas ${a.asli}`));
  else if (a.lokasi === 'kontrol') siapa.append(el('small', 'tugas-asli', ' ruang kontrol'));
  li.append(t, siapa, el('span', 'apa', a.label));
  if (a.luar) li.querySelector('.apa').append(el('span', 'tanda-luar', '⚠ ' + a.luar));
  daftarAksi.prepend(li);
  batasi(daftarAksi);
  totalAksi++;
  document.getElementById('jumlah-aksi').textContent = `· ${totalAksi}`;
}

function kartuLaporan(lap) {
  buangKosong(daftarLaporan);
  const li = el('li', 'laporan');
  const kepala = el('div', 'kepala');
  const dur = Math.round(lap.durasiMs / 1000);
  kepala.append(el('span', '', `${jam(lap.ts)} · ${(tim.manager && tim.manager.nama) || 'Manager'}`),
    el('span', '', dur >= 60 ? `${Math.floor(dur / 60)} mnt ${dur % 60} dtk` : `${dur} dtk`));
  li.append(kepala, el('div', 'ringkas', lap.ringkas));
  if (lap.baris.length) {
    const ul = el('ul');
    for (const b of lap.baris) {
      const item = el('li');
      item.append(el('b', '', b.karyawan), document.createTextNode(` (${b.divisi}): ${b.kerja.join(', ')}`));
      ul.append(item);
    }
    li.append(ul);
  }
  if (lap.luar.length) {
    const box = el('div', 'luar');
    box.append(el('strong', '', `⚠ Berdampak di luar folder (${lap.luar.length})`));
    for (const x of lap.luar) box.append(el('div', '', `${x.karyawan}: ${x.alasan}`));
    li.append(box);
  }
  daftarLaporan.prepend(li);
  batasi(daftarLaporan);
}

function tulisNamaKantor(k) {
  const h1 = document.querySelector('#atas h1');
  const bagian = (k && Array.isArray(k.nama) && k.nama.length) ? k.nama : [{ teks: 'Kantor AI' }];
  h1.replaceChildren(...bagian.flatMap((b, i) => {
    const s = el('span', 'kata', b.teks);
    if (b.warna) s.style.color = b.warna;
    return i ? [document.createTextNode(' '), s] : [s];
  }));
  document.title = bagian.map((b) => b.teks).join(' ');
}

// ---------- Sambungan ke server ----------
function terima(p) {
  if (p.type === 'awal') {
    tim = p.tim; tugasKini = p.tugas || null; infoJadwal = p.jadwal || null;
    window.__tim = tim;
    tulisNamaKantor(tim.kantor);
    giliran.clear(); dataDivisi.clear();
    laporanAkhir = p.laporan.length ? p.laporan[p.laporan.length - 1] : null;
    for (const a of p.aksi) catatDivisi(a);
    bangunKantor(tim);
    aturTempat();
    for (const o of orang.values()) { o.rumah.layar.set('mati'); gelembung(o, ''); }
    if (rk) for (const pc of rk.pcs) pc.mode = 'mati';
    daftarAksi.innerHTML = '<li class="kosong">Belum ada aksi tercatat.</li>';
    daftarLaporan.innerHTML = '<li class="kosong">Belum ada laporan. Manager menulis laporan tiap kali Claude selesai menjawab.</li>';
    totalAksi = 0;
    for (const a of p.aksi) barisAksi(a, false);
    for (const l of p.laporan) kartuLaporan(l);
    for (const [sesi, g] of Object.entries(p.aktif || {})) {
      giliran.set(sesi, { layar: new Set(), aktif: new Set(), orangAktif: null, terakhir: g.terakhir, jumlah: 0 });
      for (const a of g.aksi) terapkanAksi(a, false); // sudah tercatat dari riwayat
    }
    if (rk) { for (let i = 0; i < 6; i++) gambarPc(i); gambarTv(); }
    perbaruiStatus(); perbaruiShift();
  } else if (p.type === 'shift') {
    tugasKini = p.tugas || null;
    aturTempat();
    if (rk) { gambarPc(4); gambarTv(); }
    perbaruiShift();
  } else if (p.type === 'perintah') {
    tutupGiliran(p.sesi);
    giliran.set(p.sesi, { layar: new Set(), aktif: new Set(), orangAktif: null, terakhir: p.ts, jumlah: 0 });
    gelembung(orangBos, 'kasih tugas baru');
    setTimeout(() => gelembung(orangBos, ''), 4000);
    perbaruiStatus();
  } else if (p.type === 'aksi') {
    terapkanAksi(p);
    barisAksi(p, true);
    perbaruiStatus();
  } else if (p.type === 'laporan') {
    tutupGiliran(p.sesi);
    laporanAkhir = p;
    if (rk) { gambarPc(5); gambarTv(); }
    kartuLaporan(p);
    managerLapor(p);
    perbaruiStatus();
  }
}

function sambung() {
  const es = new EventSource('/api/aliran');
  es.onmessage = (e) => { try { terima(JSON.parse(e.data)); } catch (err) { console.error(err); } };
  es.onerror = () => perbaruiStatus('Terputus dari server, mencoba lagi…', 'putus');
}

setInterval(() => {
  const kini = Date.now();
  let berubah = false;
  for (const [s, g] of giliran) if (kini - g.terakhir > GILIRAN_BASI_MS) { tutupGiliran(s); berubah = true; }
  if (berubah) perbaruiStatus();
}, 15000);

function putar(t) {
  if (jalan && orangManager) {
    const k = Math.min(1, (t - jalan.mulai) / jalan.durasi);
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    orangManager.grup.position.lerpVectors(jalan.dari, jalan.ke, e);
    if (k >= 1) { const f = jalan.lalu; jalan = null; f && f(); }
  }
  kontrol.update();
  renderer.render(adegan, kamera);
  label2d.render(adegan, kamera);
  requestAnimationFrame(putar);
}

// Untuk pengujian/penyesuaian kamera dari konsol browser.
window.__kantor = { kamera, kontrol, ruangKontrol: () => rk, pasKamera };

ukur();
sambung();
requestAnimationFrame(putar);
