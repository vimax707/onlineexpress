'use strict';
// Memetakan satu baris catatan ke divisi & karyawan berdasarkan tim.json.
// Dipakai server (dan bisa diuji sendiri). Tidak ada tebakan acak:
// kalau tidak ada aturan yang cocok, aksi masuk ke divisi "cadangan".

const KATA_KERJA = {
  Read: 'baca', Write: 'nulis', Edit: 'edit', MultiEdit: 'edit', NotebookEdit: 'edit notebook',
  Bash: 'jalanin perintah', Grep: 'cari isi', Glob: 'cari file', LS: 'lihat folder',
  WebFetch: 'buka web', WebSearch: 'riset web', Agent: 'delegasi', Task: 'delegasi',
  TodoWrite: 'catat tugas', TaskCreate: 'catat tugas', TaskUpdate: 'catat tugas',
  Skill: 'pakai skill', Artifact: 'kelola artifact', ToolSearch: 'cari alat',
  SendUserFile: 'kirim file', PushNotification: 'kirim notifikasi', AskUserQuestion: 'tanya bos',
};

function kataKerja(tool) {
  if (KATA_KERJA[tool]) return KATA_KERJA[tool];
  if (tool && tool.startsWith('mcp__')) {
    const parts = tool.split('__');
    const lay = (parts[1] || '').replace(/^plugin_[^_]+_/, '');
    return `${lay} · ${(parts.slice(2).join('_') || '').replace(/[_-]+/g, ' ')}`;
  }
  return String(tool || 'kerja').toLowerCase();
}

function namaFile(file) {
  if (!file) return null;
  const i = file.lastIndexOf('/');
  return i >= 0 && i < file.length - 1 ? file.slice(i + 1) : file;
}

function cocokFolder(file, folder) {
  if (!file || !folder) return false;
  if (folder.endsWith('/')) return file === folder.slice(0, -1) || file.startsWith(folder);
  return file === folder;
}

function cocokAlat(tool, pola) {
  if (pola.endsWith('*')) return tool.startsWith(pola.slice(0, -1));
  return tool === pola;
}

function cocokAturan(aturan, aksi) {
  if (!aturan) return false;
  const file = aksi.file || '';
  const nama = (namaFile(file) || '').toLowerCase();
  if (aturan.semua) return true;
  if (aturan.alat && aturan.alat.some((p) => cocokAlat(aksi.tool || '', p))) return true;
  if (!file) return false;
  if (aturan.folder && aturan.folder.some((f) => cocokFolder(file, f))) return true;
  if (aturan.namaMengandung && aturan.namaMengandung.some((k) => nama.includes(k.toLowerCase()))) return true;
  if (aturan.ekstensi && aturan.ekstensi.some((e) => nama.endsWith(e.toLowerCase()))) return true;
  return false;
}

// Mengembalikan { divisi, karyawan } (id divisi & nama karyawan).
function petakan(tim, aksi) {
  const semuaDiv = tim.divisi || [];
  let div = null;
  if (aksi.file) {
    // Folder terpanjang yang cocok menang.
    let terbaik = -1;
    for (const d of semuaDiv) for (const f of d.folder || []) {
      if (cocokFolder(aksi.file, f) && f.length > terbaik) { terbaik = f.length; div = d; }
    }
  }
  const urutan = div ? [div] : [];
  // Tanpa folder yang cocok: cari divisi mana pun yang punya aturan alat/nama yang pas (tanpa 'semua').
  if (!div) {
    for (const d of semuaDiv) for (const k of d.karyawan || []) {
      if (k.aturan && !k.aturan.semua && cocokAturan(k.aturan, aksi)) return { divisi: d.id, karyawan: k.nama };
    }
    // Penampung khusus (mis. Wiwid) untuk aksi yang tidak cocok di mana pun.
    if (tim.cadanganKaryawan) {
      const d = semuaDiv.find((x) => (x.karyawan || []).some((k) => k.nama === tim.cadanganKaryawan));
      if (d) return { divisi: d.id, karyawan: tim.cadanganKaryawan };
    }
    const cad = semuaDiv.find((d) => d.id === tim.cadangan) || semuaDiv[semuaDiv.length - 1];
    if (cad) urutan.push(cad);
  }
  for (const d of urutan) {
    for (const k of d.karyawan || []) if (cocokAturan(k.aturan, aksi)) return { divisi: d.id, karyawan: k.nama };
    if (d.karyawan && d.karyawan[0]) return { divisi: d.id, karyawan: d.karyawan[0].nama };
  }
  return { divisi: null, karyawan: null };
}

function label(aksi) {
  const f = namaFile(aksi.file);
  return f ? `${kataKerja(aksi.tool)} · ${f}` : kataKerja(aksi.tool);
}

// Ruang Kontrol: operator yang tidak sedang bertugas sedang istirahat, jadi
// pekerjaannya diambil alih petugas shift. Aksi yang berdampak di luar folder
// dikerjakan Penanggung Jawab (PJ). Mengembalikan { karyawan, asli, lokasi }.
//   lokasi: 'kontrol' (duduk di ruang kontrol), 'pengawas', atau 'meja' (meja divisi).
function petugasAksi(tim, tugas, aksi, hasilPeta) {
  const rk = tim.ruangKontrol;
  const nama = hasilPeta.karyawan;
  const tanpaUbah = { karyawan: nama, asli: null, lokasi: 'meja' };
  if (!rk || !nama) return tanpaUbah;
  if (nama === rk.pengawas) return { ...tanpaUbah, lokasi: 'pengawas' };
  if (!(rk.operator || []).includes(nama)) return tanpaUbah;
  // Tanpa petugas terjadwal di shift ini, operator bekerja di meja divisinya seperti biasa.
  if (!tugas || (!tugas.pj && !tugas.operator)) return tanpaUbah;
  // Aksi yang berdampak di luar folder selalu ditangani PJ shift.
  if (aksi.luar && tugas.pj) return { karyawan: tugas.pj, asli: nama === tugas.pj ? null : nama, lokasi: 'kontrol' };
  if (nama === tugas.pj || nama === tugas.operator) return { karyawan: nama, asli: null, lokasi: 'kontrol' };
  return { karyawan: tugas.operator || tugas.pj, asli: nama, lokasi: 'kontrol' };
}

module.exports = { petakan, petugasAksi, label, kataKerja, namaFile };
