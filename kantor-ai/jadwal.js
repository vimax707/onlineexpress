'use strict';
// Jadwal shift Ruang Kontrol. Dibaca dari jadwal.xlsx (Excel) atau jadwal.csv.
// Node murni: file .xlsx adalah arsip zip berisi XML, dibuka dengan zlib bawaan.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']; // urutan Date.getDay()
const ALIAS_HARI = { ahad: 'Minggu', "jum'at": 'Jumat', jumat: 'Jumat' };

// ---------- Pembaca .xlsx ----------
function bukaZip(buf) {
  // Cari "End of central directory", lalu baca daftar isi arsip.
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('bukan file Excel (.xlsx) yang valid');
  const jumlah = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const isi = new Map();
  for (let n = 0; n < jumlah; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const metode = buf.readUInt16LE(p + 10);
    const ukuranZip = buf.readUInt32LE(p + 20);
    const panjangNama = buf.readUInt16LE(p + 28);
    const panjangEkstra = buf.readUInt16LE(p + 30);
    const panjangKomentar = buf.readUInt16LE(p + 32);
    const offsetLokal = buf.readUInt32LE(p + 42);
    const nama = buf.toString('utf8', p + 46, p + 46 + panjangNama);
    isi.set(nama, () => {
      const nl = buf.readUInt16LE(offsetLokal + 26), el = buf.readUInt16LE(offsetLokal + 28);
      const mulai = offsetLokal + 30 + nl + el;
      const data = buf.subarray(mulai, mulai + ukuranZip);
      if (metode === 0) return data.toString('utf8');
      if (metode === 8) return zlib.inflateRawSync(data).toString('utf8');
      throw new Error('kompresi tidak didukung');
    });
    p += 46 + panjangNama + panjangEkstra + panjangKomentar;
  }
  return isi;
}

const ENTITAS = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
function teksXml(s) {
  return s.replace(/<[^>]+>/g, '').replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e) => {
    if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ENTITAS[e] ?? m;
  });
}

function bacaXlsx(file) {
  const zip = bukaZip(fs.readFileSync(file));
  const baca = (n) => (zip.has(n) ? zip.get(n)() : null);
  // Sheet pertama menurut urutan di workbook.
  let lokasi = 'xl/worksheets/sheet1.xml';
  const wb = baca('xl/workbook.xml'), rels = baca('xl/_rels/workbook.xml.rels');
  const rid = wb && (wb.match(/<sheet\b[^>]*\br:id="([^"]+)"/) || [])[1];
  if (rid && rels) {
    const rel = rels.match(new RegExp(`<Relationship\\b[^>]*\\bId="${rid}"[^>]*>`));
    const target = rel && (rel[0].match(/Target="([^"]+)"/) || [])[1];
    if (target) lokasi = target.startsWith('/') ? target.slice(1) : 'xl/' + target.replace(/^\.\//, '');
  }
  const sst = (baca('xl/sharedStrings.xml') || '').match(/<si\b[\s\S]*?<\/si>/g) || [];
  const strings = sst.map((si) => teksXml((si.match(/<t\b[^>]*>[\s\S]*?<\/t>/g) || []).join('')));
  const sheet = baca(lokasi);
  if (!sheet) throw new Error('sheet pertama tidak ditemukan');
  const tabel = [];
  for (const row of sheet.match(/<row\b[\s\S]*?<\/row>/g) || []) {
    const baris = [];
    for (const c of row.match(/<c\b[^>]*?(\/>|>[\s\S]*?<\/c>)/g) || []) {
      const ref = (c.match(/\br="([A-Z]+)\d+"/) || [])[1];
      const kol = ref ? [...ref].reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0) - 1 : baris.length;
      const tipe = (c.match(/\bt="(\w+)"/) || [])[1];
      let nilai = '';
      if (tipe === 'inlineStr') nilai = teksXml((c.match(/<is>([\s\S]*?)<\/is>/) || [])[1] || '');
      else {
        const v = (c.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
        if (v != null) nilai = tipe === 's' ? (strings[Number(v)] ?? '') : teksXml(v);
      }
      baris[kol] = nilai;
    }
    tabel.push(Array.from(baris, (x) => (x == null ? '' : String(x).trim())));
  }
  return tabel;
}

// ---------- Pembaca .csv (Excel Indonesia memakai ; sebagai pemisah) ----------
function bacaCsv(file) {
  let teks = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
  const baris = teks.split(/\r?\n/).filter((l) => l.trim() && !/^sep=/i.test(l.trim()));
  if (!baris.length) return [];
  const pemisah = [';', '\t', ','].find((p) => baris[0].includes(p)) || ';';
  return baris.map((l) => {
    const sel = []; let cur = '', kutip = false;
    for (let i = 0; i < l.length; i++) {
      const ch = l[i];
      if (kutip) { if (ch === '"' && l[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') kutip = false; else cur += ch; }
      else if (ch === '"') kutip = true;
      else if (ch === pemisah) { sel.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    sel.push(cur.trim());
    return sel;
  });
}

// ---------- Memuat & memeriksa ----------
// Memilih file jadwal: .xlsx dan .csv dengan nama dasar sama; yang terakhir diubah menang.
function pilihFile(dir, nama) {
  const dasar = path.join(dir, nama.replace(/\.(xlsx|csv)$/i, ''));
  const calon = ['.xlsx', '.csv'].map((e) => dasar + e).filter((f) => fs.existsSync(f));
  calon.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return { file: calon[0] || null, semua: ['.xlsx', '.csv'].map((e) => dasar + e) };
}

function normalNama(daftar, s) {
  const t = String(s || '').trim().toLowerCase();
  return daftar.find((n) => n.toLowerCase() === t) || null;
}

function muatJadwal(dir, rk) {
  const hasil = { sumber: null, slot: {}, peringatan: [] };
  if (!rk) return hasil;
  const { file } = pilihFile(dir, rk.jadwal || 'jadwal.xlsx');
  if (!file) { hasil.peringatan.push('File jadwal belum ada (jadwal.xlsx atau jadwal.csv).'); return hasil; }
  hasil.sumber = path.basename(file);
  let tabel;
  try { tabel = /\.xlsx$/i.test(file) ? bacaXlsx(file) : bacaCsv(file); }
  catch (e) { hasil.peringatan.push(`${hasil.sumber} tidak bisa dibaca: ${e.message}`); hasil.gagal = true; return hasil; }

  const kepala = (tabel[0] || []).map((x) => x.toLowerCase());
  const cari = (...kata) => kepala.findIndex((k) => kata.some((w) => k.includes(w)));
  const iHari = cari('hari'), iShift = cari('shift'), iPj = cari('penanggung', 'pj'), iOp = cari('operator');
  if ([iHari, iShift, iPj, iOp].some((i) => i < 0)) {
    hasil.peringatan.push(`Baris judul ${hasil.sumber} harus berisi kolom: Hari, Shift, Penanggung Jawab, Operator.`);
    return hasil;
  }
  const namaShift = (rk.shift || []).map((s) => s.nama);
  for (let r = 1; r < tabel.length; r++) {
    const b = tabel[r];
    if (!b.some(Boolean)) continue;
    const no = `baris ${r + 1}`;
    const hariMentah = (b[iHari] || '').toLowerCase();
    const hari = HARI.find((h) => h.toLowerCase() === hariMentah) || ALIAS_HARI[hariMentah];
    const shift = normalNama(namaShift, b[iShift]);
    const pj = normalNama(rk.penanggungJawab || [], b[iPj]);
    const op = normalNama(rk.operator || [], b[iOp]);
    if (!hari) { hasil.peringatan.push(`${no}: hari "${b[iHari] || ''}" tidak dikenal.`); continue; }
    if (!shift) { hasil.peringatan.push(`${no}: shift "${b[iShift] || ''}" tidak dikenal (pakai ${namaShift.join('/')}).`); continue; }
    if (b[iPj] && !pj) hasil.peringatan.push(`${no}: "${b[iPj]}" bukan penanggung jawab.`);
    if (b[iOp] && !op) hasil.peringatan.push(`${no}: "${b[iOp]}" bukan operator.`);
    if (pj && op && pj === op) hasil.peringatan.push(`${no}: ${pj} tidak bisa jadi PJ sekaligus operator.`);
    const kunci = `${hari}|${shift}`;
    if (hasil.slot[kunci]) hasil.peringatan.push(`${no}: ${hari} ${shift} sudah diisi di baris sebelumnya, baris ini dipakai.`);
    hasil.slot[kunci] = { pj: pj || null, operator: op && op !== pj ? op : null };
  }
  for (const h of HARI) for (const s of namaShift) {
    if (!hasil.slot[`${h}|${s}`]) hasil.peringatan.push(`${h} ${s} belum ada petugasnya.`);
  }
  return hasil;
}

// ---------- Shift yang berjalan pada waktu tertentu (jam komputer ini) ----------
function menit(jam) { const [h, m] = String(jam).split(':').map(Number); return h * 60 + (m || 0); }

function shiftPada(rk, jadwal, ts) {
  if (!rk || !Array.isArray(rk.shift) || !rk.shift.length) return null;
  const t = new Date(ts);
  const kini = t.getHours() * 60 + t.getMinutes();
  for (const s of rk.shift) {
    const a = menit(s.mulai), b = menit(s.selesai);
    const lintasHari = b <= a;
    let mundurHari;
    if (!lintasHari && kini >= a && kini < b) mundurHari = 0;
    else if (lintasHari && kini >= a) mundurHari = 0;
    else if (lintasHari && kini < b) mundurHari = 1; // shift malam yang dimulai kemarin
    else continue;
    const mulai = new Date(t); mulai.setHours(0, 0, 0, 0); mulai.setDate(mulai.getDate() - mundurHari);
    mulai.setMinutes(a);
    const selesai = new Date(mulai); selesai.setMinutes(selesai.getMinutes() + ((b - a + 1440) % 1440 || 1440));
    const hari = HARI[mulai.getDay()];
    const isi = (jadwal && jadwal.slot[`${hari}|${s.nama}`]) || {};
    return { kunci: `${mulai.toDateString()}|${s.nama}`, hari, shift: s.nama, mulai: s.mulai, selesai: s.selesai,
      mulaiTs: mulai.getTime(), selesaiTs: selesai.getTime(), pj: isi.pj || null, operator: isi.operator || null };
  }
  return null;
}

module.exports = { muatJadwal, shiftPada, pilihFile, bacaXlsx, bacaCsv, HARI };
