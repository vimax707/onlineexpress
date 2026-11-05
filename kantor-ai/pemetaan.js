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

module.exports = { petakan, label, kataKerja, namaFile };
