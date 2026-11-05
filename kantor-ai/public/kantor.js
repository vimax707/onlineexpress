// Tampilan Kantor AI. Semua perubahan di layar dipicu oleh pesan dari server
// (yang berasal dari hook Claude Code). Tidak ada aktivitas acak: kalau tidak
// ada pesan, kantornya diam.
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
const kamera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
const kontrol = new OrbitControls(kamera, renderer.domElement);
kontrol.enableDamping = true;
kontrol.maxPolarAngle = Math.PI * 0.45;
kontrol.minDistance = 6;
kontrol.maxDistance = 60;

adegan.add(new THREE.HemisphereLight('#ffffff', '#e8ebf0', 2.2));
const matahari = new THREE.DirectionalLight('#ffffff', 1.4);
matahari.position.set(8, 16, 10);
matahari.castShadow = true;
matahari.shadow.mapSize.set(2048, 2048);
matahari.shadow.radius = 4;
adegan.add(matahari);

const lantai = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: '#e4e6ea' }));
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

// Satu meja + satu karakter. Karakter duduk di sisi depan (menghadap layar),
// layar menghadap kamera supaya nyala/matinya terlihat.
function buatMeja(nama, peran, warna, besar = 1) {
  const g = new THREE.Group();
  const lebar = 1.4 * besar;
  g.add(kotak(lebar, 0.06, 0.8, bahan.meja, 0, 0.75, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1])
    g.add(kotak(0.05, 0.72, 0.05, bahan.kaki, sx * (lebar / 2 - 0.08), 0.36, sz * 0.32));
  g.add(kotak(0.06, 0.18, 0.06, bahan.kaki, 0, 0.87, -0.2));
  const casingMat = bahan.monitor.clone();
  casingMat.emissive = new THREE.Color('#000000');
  g.add(kotak(0.66, 0.42, 0.05, casingMat, 0, 1.17, -0.22));
  // lampu kecil di meja: hanya menyala saat karyawan bekerja
  const lampuMat = new THREE.MeshStandardMaterial({ color: '#e5e7eb', emissive: '#000000' });
  const lampu = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 16), lampuMat);
  lampu.position.set(lebar / 2 - 0.15, 0.795, 0.25);
  g.add(lampu);
  const layarMat = new THREE.MeshStandardMaterial({ color: '#1c1f24', emissive: '#000000', roughness: 0.3 });
  const layar = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.36), layarMat);
  layar.position.set(0, 1.17, -0.193);
  g.add(layar);
  // kursi + orang
  g.add(kotak(0.5, 0.08, 0.5, bahan.kursi, 0, 0.45, 0.75));
  g.add(kotak(0.5, 0.5, 0.06, bahan.kursi, 0, 0.75, 1.0));
  const badanMat = new THREE.MeshStandardMaterial({ color: warna, roughness: 0.7 });
  const orang = new THREE.Group();
  const badan = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.36, 4, 12), badanMat);
  badan.position.y = 0.82; badan.castShadow = true;
  const kepala = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 16), bahan.kulit);
  kepala.position.y = 1.3; kepala.castShadow = true;
  orang.add(badan, kepala);
  orang.position.set(0, 0, 0.72);
  g.add(orang);
  const n = label(peran ? `${nama} · ${peran}` : nama, 'nama' + (besar > 1 ? ' bos' : ''), 1.62);
  orang.add(n);
  const gel = label('', 'gelembung sembunyi', 2.25);
  orang.add(gel);
  return { grup: g, orang, layar, layarMat, casingMat, lampuMat, nama: n.element, gelembung: gel.element, warna, kursi: orang.position.clone() };
}

function campur(hex, putih) { return new THREE.Color(hex).lerp(new THREE.Color('#ffffff'), putih); }

function buatRuang(judul, warna, w, d) {
  const g = new THREE.Group();
  const alas = kotak(w, 0.04, d, new THREE.MeshStandardMaterial({ color: campur(warna, 0.82) }), 0, 0.02, 0);
  alas.castShadow = false;
  g.add(alas);
  const t = 0.08, h = 0.55;
  g.add(kotak(w, h, t, bahan.dinding, 0, h / 2, -d / 2));
  g.add(kotak(t, h, d, bahan.dinding, -w / 2, h / 2, 0));
  g.add(kotak(t, h, d, bahan.dinding, w / 2, h / 2, 0));
  const strip = kotak(w, 0.04, t + 0.01, new THREE.MeshStandardMaterial({ color: warna }), 0, h, -d / 2);
  g.add(strip);
  const p = label(judul, 'papan-ruang', 0);
  p.position.set(0, 0.05, d / 2 + 0.35);
  g.add(p);
  return g;
}

// ---------- Bangun kantor dari tim.json ----------
let meja = new Map();      // "divisi/nama" -> objek meja
let mejaManager = null, mejaBos = null;
let warnaDivisi = new Map();
let tandaTim = '';

function bangunKantor(tim) {
  const tanda = JSON.stringify(tim);
  if (tanda === tandaTim) return;
  tandaTim = tanda;
  adegan.remove(gedung);
  gedung.traverse((o) => { if (o.element) o.element.remove(); });
  gedung = new THREE.Group();
  adegan.add(gedung);
  meja = new Map();
  warnaDivisi = new Map();

  const JX = 2.3, JZ = 2.7;
  const divisi = tim.divisi || [];
  const perBaris = divisi.length > 3 ? 2 : Math.max(divisi.length, 1);
  let x = 0, z = 0, tinggiBaris = 0, lebarMaks = 0;
  const posisi = [];
  divisi.forEach((d, i) => {
    const n = Math.max((d.karyawan || []).length, 1);
    const kol = Math.min(3, n), bar = Math.ceil(n / 3);
    const w = kol * JX + 1.2, dd = bar * JZ + 1.0;
    if (i > 0 && i % perBaris === 0) { z += tinggiBaris + 2.4; x = 0; tinggiBaris = 0; }
    posisi.push({ d, w, dd, kol, x, z });
    x += w + 1.4; lebarMaks = Math.max(lebarMaks, x - 1.4); tinggiBaris = Math.max(tinggiBaris, dd);
  });
  const totalZ = z + tinggiBaris;

  for (const p of posisi) {
    const warna = p.d.warna || '#94a3b8';
    warnaDivisi.set(p.d.id, warna);
    const cx = p.x + p.w / 2 - lebarMaks / 2, cz = p.z + p.dd / 2 - totalZ / 2;
    const r = buatRuang(p.d.nama, warna, p.w, p.dd);
    r.position.set(cx, 0, cz);
    gedung.add(r);
    (p.d.karyawan || []).forEach((k, j) => {
      const c = j % 3, b = Math.floor(j / 3);
      const kolBaris = Math.min(p.kol, (p.d.karyawan.length - b * 3));
      const m = buatMeja(k.nama, '', campur(warna, 0.15).getStyle(), 1);
      m.grup.position.set(cx + (c - (kolBaris - 1) / 2) * JX, 0, cz - p.dd / 2 + 0.9 + b * JZ);
      m.divisi = p.d.id;
      gedung.add(m.grup);
      meja.set(`${p.d.id}/${k.nama}`, m);
    });
  }

  // Ruang bos & manager di depan.
  const bz = totalZ / 2 + 3.2;
  const rb = buatRuang('Ruang Bos', '#64748b', 7.4, 3.6);
  rb.position.set(0, 0, bz);
  gedung.add(rb);
  const bos = tim.bos || { nama: 'Bos' };
  mejaBos = buatMeja(`${bos.nama} (kamu)`, '', '#334155', 1.4);
  mejaBos.grup.position.set(-1.6, 0, bz - 0.9);
  gedung.add(mejaBos.grup);
  const man = tim.manager || { nama: 'Manager' };
  mejaManager = buatMeja(man.nama, man.peran || 'Manager', '#8b5cf6', 1);
  mejaManager.grup.position.set(1.9, 0, bz - 0.9);
  gedung.add(mejaManager.grup);

  // Layar sempit (ponsel) butuh kamera lebih jauh supaya semua ruang muat.
  const sempit = Math.max(1, 1.5 / Math.max(kamera.aspect, 0.3));
  const jangkau = Math.max(lebarMaks, totalZ + 8) * Math.min(sempit, 2.6);
  kamera.position.set(0, jangkau * 0.8, bz + jangkau * 0.62);
  kontrol.target.set(0, 0, bz * 0.25);
  kontrol.update();
}

// ---------- Status karyawan ----------
// giliran: sesi -> { pelaku: Set(kunci), terakhirKunci, terakhir, jumlah }
const giliran = new Map();

function setLayar(m, mode) {
  if (!m) return;
  if (mode === 'nyala') {
    m.layarMat.color.copy(LAYAR_NYALA); m.layarMat.emissive.copy(LAYAR_NYALA); m.layarMat.emissiveIntensity = 0.9;
    m.casingMat.emissive.copy(LAYAR_NYALA); m.casingMat.emissiveIntensity = 0.55;
    m.lampuMat.emissive.set('#22c55e'); m.lampuMat.emissiveIntensity = 1;
  } else if (mode === 'redup') {
    m.layarMat.color.set('#3b4a5c'); m.layarMat.emissive.copy(LAYAR_NYALA); m.layarMat.emissiveIntensity = 0.18;
    m.casingMat.emissive.copy(LAYAR_NYALA); m.casingMat.emissiveIntensity = 0.12;
    m.lampuMat.emissive.set('#000000');
  } else {
    m.layarMat.color.copy(LAYAR_MATI); m.layarMat.emissive.set('#000000'); m.layarMat.emissiveIntensity = 0;
    m.casingMat.emissive.set('#000000'); m.lampuMat.emissive.set('#000000');
  }
  m.nama.classList.toggle('aktif', mode === 'nyala');
}
function gelembung(m, teks, luar) {
  if (!m) return;
  m.gelembung.textContent = teks || '';
  m.gelembung.classList.toggle('sembunyi', !teks);
  m.gelembung.classList.toggle('luar', !!luar);
}

function terapkanAksi(a) {
  let g = giliran.get(a.sesi);
  if (!g) { g = { pelaku: new Set(), terakhirKunci: null, terakhir: a.ts, jumlah: 0 }; giliran.set(a.sesi, g); }
  const kunci = `${a.divisi}/${a.karyawan}`;
  if (g.terakhirKunci && g.terakhirKunci !== kunci) {
    const lama = meja.get(g.terakhirKunci);
    setLayar(lama, 'redup'); gelembung(lama, '');
  }
  const m = meja.get(kunci);
  setLayar(m, 'nyala');
  gelembung(m, (a.luar ? '⚠ ' : '') + a.label, a.luar);
  g.pelaku.add(kunci); g.terakhirKunci = kunci; g.terakhir = a.ts; g.jumlah++;
}

function tutupGiliran(sesi) {
  const g = giliran.get(sesi);
  if (!g) return;
  for (const k of g.pelaku) {
    // Jangan matikan karyawan yang masih dipakai sesi lain yang aktif.
    let dipakai = false;
    for (const [s, h] of giliran) if (s !== sesi && h.pelaku.has(k)) dipakai = true;
    if (!dipakai) { const m = meja.get(k); setLayar(m, 'mati'); gelembung(m, ''); }
  }
  giliran.delete(sesi);
}

function perbaruiStatus(teks, kelas) {
  const el = document.getElementById('status');
  if (teks) { el.className = 'status ' + kelas; el.querySelector('b').textContent = teks; return; }
  let n = 0;
  for (const g of giliran.values()) n += g.jumlah;
  if (giliran.size) { el.className = 'status kerja'; el.querySelector('b').textContent = `Bekerja · ${n} aksi giliran ini`; }
  else { el.className = 'status diam'; el.querySelector('b').textContent = 'Diam: tidak ada pekerjaan'; }
}

// ---------- Animasi yang dipicu event (Manager lapor ke Bos) ----------
let jalan = null; // { dari, ke, mulai, durasi, lalu }
function managerLapor(lap) {
  if (!mejaManager || !mejaBos) return;
  const asal = mejaManager.kursi.clone();
  const posBos = new THREE.Vector3();
  mejaBos.grup.getWorldPosition(posBos);
  const posMan = new THREE.Vector3();
  mejaManager.grup.getWorldPosition(posMan);
  const tujuan = new THREE.Vector3(posBos.x - posMan.x + 1.3, 0, posBos.z - posMan.z + 1.2);
  gelembung(mejaManager, 'menyusun laporan…');
  jalan = { dari: asal, ke: tujuan, mulai: performance.now(), durasi: 1400, lalu: () => {
    gelembung(mejaManager, lap.luar.length ? `⚠ lapor: ${lap.ringkas}` : `lapor: ${lap.ringkas}`, lap.luar.length);
    setTimeout(() => {
      jalan = { dari: tujuan, ke: asal, mulai: performance.now(), durasi: 1400, lalu: () => gelembung(mejaManager, '') };
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
  kepala.append(el('span', '', `${jam(lap.ts)} · ${(window.__tim?.manager?.nama) || 'Manager'}`),
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

// ---------- Nama kantor (dari tim.json -> kantor.nama) ----------
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
    window.__tim = p.tim;
    tulisNamaKantor(p.tim.kantor);
    bangunKantor(p.tim);
    for (const m of meja.values()) { setLayar(m, 'mati'); gelembung(m, ''); }
    giliran.clear();
    daftarAksi.innerHTML = '<li class="kosong">Belum ada aksi tercatat.</li>';
    daftarLaporan.innerHTML = '<li class="kosong">Belum ada laporan. Manager menulis laporan tiap kali Claude selesai menjawab.</li>';
    totalAksi = 0;
    for (const a of p.aksi) barisAksi(a, false);
    for (const l of p.laporan) kartuLaporan(l);
    // Giliran yang masih berjalan saat halaman dibuka: tampilkan apa adanya.
    for (const [sesi, g] of Object.entries(p.aktif || {})) {
      giliran.set(sesi, { pelaku: new Set(), terakhirKunci: null, terakhir: g.terakhir, jumlah: 0 });
      for (const a of g.aksi) terapkanAksi(a);
    }
    perbaruiStatus();
  } else if (p.type === 'perintah') {
    tutupGiliran(p.sesi);
    giliran.set(p.sesi, { pelaku: new Set(), terakhirKunci: null, terakhir: p.ts, jumlah: 0 });
    gelembung(mejaBos, 'kasih tugas baru');
    setTimeout(() => gelembung(mejaBos, ''), 4000);
    perbaruiStatus();
  } else if (p.type === 'aksi') {
    terapkanAksi(p);
    barisAksi(p, true);
    perbaruiStatus();
  } else if (p.type === 'laporan') {
    tutupGiliran(p.sesi);
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

// Giliran tanpa kabar terlalu lama (misal sesi berhenti mendadak) dianggap selesai.
setInterval(() => {
  const kini = Date.now();
  let berubah = false;
  for (const [s, g] of giliran) if (kini - g.terakhir > GILIRAN_BASI_MS) { tutupGiliran(s); berubah = true; }
  if (berubah) perbaruiStatus();
}, 15000);

function putar(t) {
  if (jalan && mejaManager) {
    const k = Math.min(1, (t - jalan.mulai) / jalan.durasi);
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    mejaManager.orang.position.lerpVectors(jalan.dari, jalan.ke, e);
    if (k >= 1) { const f = jalan.lalu; jalan = null; f && f(); }
  }
  kontrol.update();
  renderer.render(adegan, kamera);
  label2d.render(adegan, kamera);
  requestAnimationFrame(putar);
}

ukur();
sambung();
requestAnimationFrame(putar);
