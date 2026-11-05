# Rangkuman Kantor AI: Sriwijaya Andalan Perkasa

Catatan ini untuk melanjutkan pekerjaan: apa yang sudah dibuat, cara menjalankannya,
dan di mana mengubah tampilan atau susunan tim. Terakhir diperbarui 5 November 2026 (perbaikan hook untuk Windows).

## Apa ini

Halaman web yang menampilkan kerja Claude Code sebagai kantor 3D. Setiap aksi Claude
(baca, tulis, edit, jalankan perintah, dll.) membuat monitor karyawan yang cocok menyala
dengan label kecil, misalnya `nulis · ide_konten.md`. Setelah Claude selesai menjawab,
Manager (Ena) merangkum giliran itu jadi satu laporan ke Bos (kamu).

**Prinsip utama: semua yang tampil itu kerja sungguhan.** Tidak ada status acak atau
aktivitas karangan. Kalau Claude sedang tidak bekerja, kantornya diam.

## Menjalankan di komputer ini

Perlu **Node.js** (https://nodejs.org). Tidak perlu `npm install`, karena tidak ada library tambahan.

| Komputer | Cara |
|---|---|
| Windows | Dobel-klik `kantor-ai\jalankan.bat` |
| Mac / Linux | `sh kantor-ai/jalankan.sh` |
| Manual | `node kantor-ai/server.js` lalu buka http://127.0.0.1:4777 |

- Browser terbuka sendiri. Biarkan jendela hitam (terminal) tetap terbuka, dan tutup untuk mematikan kantor.
- Kalau kantor sudah jalan, menjalankan lagi hanya membuka halamannya.
- Port lain: `PORT=4778 node kantor-ai/server.js` (Mac/Linux) atau `set PORT=4778` lalu jalankan (Windows).
- Agar kantornya ramai, jalankan `claude` **di dalam folder `onlineexpress`** di komputer yang sama.
  Sesi Claude di cloud (claude.ai/code) tidak tampil di kantor lokal, karena catatannya ada di cloud.

## Isi folder `kantor-ai/`

| File | Fungsi |
|---|---|
| `hook.js` | Dipanggil Claude Code di setiap aksi. Menulis satu baris ke `data/aktivitas.jsonl`. |
| `server.js` | Server lokal (hanya 127.0.0.1). Membaca catatan dan mengirim aksi ke browser secara langsung. |
| `pemetaan.js` | Aturan "aksi ini milik karyawan siapa" dan kata kerja label (`nulis`, `baca`, …). |
| `tim.json` | **Susunan tim**: nama kantor, Manager, Bos, divisi, karyawan, aturan. |
| `public/index.html` | Kerangka halaman. |
| `public/kantor.js` | Gambar kantor 3D (Three.js) dan panel kanan. |
| `public/gaya.css` | Warna, huruf, dan tata letak panel. |
| `public/vendor/` | Three.js 0.160.0 disimpan lokal, jadi halaman jalan tanpa internet. |
| `jalankan.bat` / `jalankan.sh` | Alat menjalankan dengan sekali klik atau perintah. |
| `cek.bat` | Pemeriksaan di Windows kalau kantor tetap diam (Node, hook, catatan, server). |
| `data/aktivitas.jsonl` | Catatan aksi. Tidak masuk git. Hapus untuk mulai bersih. |

Hook dipasang di `.claude/settings.json` (PreToolUse, UserPromptSubmit, Stop). Perintahnya
`node -e "try{require(require('path').join(process.env.CLAUDE_PROJECT_DIR||process.cwd(),'kantor-ai','hook.js'))}catch(e){}"`.
Node sendiri yang membaca lokasi proyek, jadi perintah ini jalan di Git Bash, PowerShell, maupun cmd.
Versi lama (`node "$CLAUDE_PROJECT_DIR/..."`) hanya jalan di bash. Cadangannya ada di `.claude/settings.json.cadangan`.

## Susunan tim saat ini (`tim.json`)

| Ruangan | Karyawan | Mendapat aksi untuk |
|---|---|---|
| Umum & Dokumentasi (biru) | Wanda | file `.md`/`.txt` di folder utama (README) |
| | Flo | sisa file di folder utama |
| Teknik (hijau) | Bayu | `kantor-ai/public/`, `.html`, `.css` |
| | Ayu | `.js`, `.json`, perintah shell |
| | Nana | sisa di `kantor-ai/` dan `.claude/` |
| Pemasaran (merah muda) | Maya | nama file mengandung *iklan, ads, promo* |
| | Reza | nama file mengandung *konten, ide, caption, artikel* |
| | Diana | sisa di `pemasaran/` dan `konten/` |
| Riset & Layanan Luar (kuning) | Anis | WebSearch, WebFetch, Grep, Glob |
| | Putri | alat MCP (Gmail, Vercel, …), Artifact, kirim file |
| | Wiwid | penampung aksi yang tidak cocok di mana pun |
| Ruang Bos | Bos (kamu), Ena (Manager) | |

Folder `pemasaran/` dan `konten/` belum ada. Isinya baru contoh, silakan ganti.

### Cara mengubah tim

Edit `kantor-ai/tim.json` lalu simpan. Server memuat ulang file ini sendiri, tanpa perlu restart.
- **Nama kantor:** `"kantor": { "nama": [ { "teks": "Sriwijaya", "warna": "#111111" }, … ] }`
- **Nama karyawan:** ganti teks setelah `"nama":`.
- **Tambah karyawan:** salin satu baris `{ "nama": …, "peran": …, "aturan": { … } }` lalu ubah isinya. Jangan lupa koma.
- **Tambah divisi:** salin satu blok `{ "id": …, "nama": …, "warna": …, "folder": [ … ], "karyawan": [ … ] }`.
  `id` harus unik, tanpa spasi.
- **Aturan karyawan** (dicek dari atas ke bawah, karyawan pertama yang cocok menang):
  `namaMengandung` (kata di nama file), `ekstensi` (`.md`), `folder` (`kantor-ai/public/`),
  `alat` (nama alat Claude, boleh diakhiri `*`), `semua: true` (penampung).
- Kalau file rusak (koma atau kutip hilang), terminal server menampilkan `tim.json tidak bisa dibaca`
  dan kantor tetap memakai susunan lama.

## Cara mengubah tampilan (`public/kantor.js` dan `public/gaya.css`)

| Yang diubah | Di mana |
|---|---|
| Warna lantai luar (sekarang abu-abu muda `#e4e6ea`) | `kantor.js`, `const lantai = …` |
| Warna latar di kejauhan | `kantor.js`, `adegan.background` |
| Warna lantai ruangan (warna divisi dicampur putih 82%) | `kantor.js`, `buatRuang`, `campur(warna, 0.82)` |
| Warna ruangan | `tim.json`, `"warna"` di tiap divisi |
| Jarak antar meja | `kantor.js`, `const JX = 2.3, JZ = 2.7` |
| Jarak antar baris ruangan | `kantor.js`, `z += tinggiBaris + 2.4` |
| Warna baju Bos / Manager | `kantor.js`, `'#334155'` (Bos), `'#8b5cf6'` (Manager) |
| Warna layar monitor yang menyala | `kantor.js`, `LAYAR_NYALA` |
| Posisi awal kamera | `kantor.js`, `kamera.position.set(…)` |
| Ukuran nama karyawan, gelembung label | `gaya.css`, `.nama`, `.gelembung` |
| Panel kanan (lebar 360px, kartu laporan) | `gaya.css`, `#tata`, `.laporan`, `.aksi` |

Perubahan `kantor.js` / `gaya.css` cukup dilihat dengan memuat ulang halaman, tanpa restart server.
Perubahan `server.js`, `pemetaan.js`, atau `hook.js` butuh restart server (tutup jendela, jalankan lagi).

## Apa yang dicatat (privasi)

- **Dicatat:** waktu, jenis kejadian, 8 karakter awal id sesi, nama alat, nama file/folder.
- **Tidak dicatat:** isi file, isi perintah, isi prompt.
- **Tanda ⚠ "di luar folder"** untuk `git push`, deploy, kirim email, publish paket, ubah GitHub,
  kirim data ke internet (bukan localhost), ubah file di luar folder, dan alat MCP yang mengubah
  layanan luar. Untuk perintah shell, isinya hanya dicocokkan di memori dan yang disimpan cuma labelnya.
  Pola hanya dicocokkan di awal tiap perintah, jadi teks di dalam kutip tidak ikut ditandai.
- Hook selalu selesai dengan sukses (tidak pernah memblokir Claude), sekitar 30 ms per aksi,
  dan berhenti sendiri setelah 1,5 detik bila macet.
- Server hanya menerima akses dari komputer ini (127.0.0.1, Host harus localhost).

## Kalau kantor tetap diam saat Claude bekerja

1. Dobel-klik `kantor-ai\cek.bat` dan baca hasilnya.
2. **Tutup Claude lalu buka lagi** setelah `git pull`, karena hook dibaca saat Claude mulai.
3. Pastikan `claude` dijalankan dari folder proyek (`cd /d D:\SAP\KantoAI\onlineexpress`).
4. Di Claude ketik `/hooks`: harus ada PreToolUse, UserPromptSubmit, dan Stop.
5. Saat ditanya "trust this folder", jawab **Yes**. Kalau dijawab No, hook tidak dijalankan.

## Keterbatasan yang diketahui

- Tanda ⚠ berupa pencocokan pola, jadi bisa terlewat. Contohnya `node kirim.js` yang mengirim email
  dari dalam skrip tidak terdeteksi.
- Hanya tiga hook yang dipasang. Lamanya perintah berjalan tidak terlihat: monitor menyala saat aksi
  dimulai dan tetap menyala sampai giliran selesai.
- Giliran tanpa kabar selama 10 menit dianggap berhenti (monitor dimatikan).
- `jalankan.bat` dan `cek.bat` belum diuji di Windows sungguhan. `jalankan.sh` dan perintah hook baru sudah diuji di Linux (bash dan sh).
- Di Windows (D:\SAP\KantoAI\onlineexpress), kantor sempat diam dengan hook versi lama. Perbaikannya (no. 7) belum dikonfirmasi di sana.

## Riwayat perubahan

1. Hook pencatat aksi, server lokal, dan `tim.json`
2. Kantor 3D, panel aktivitas, laporan Manager, dan tanda ⚠
3. Tanda ⚠ hanya untuk perintah yang benar-benar dijalankan
4. Nama kantor *Sriwijaya Andalan Perkasa* (hitam, biru muda, kuning)
5. Ganti nama karyawan, lantai abu-abu muda
6. Alat jalankan (`jalankan.bat`, `jalankan.sh`) dan rangkuman ini
7. Hook tidak bergantung jenis terminal (perbaikan untuk Windows), `cek.bat` untuk pemeriksaan

Semua ada di branch `claude/practical-gauss-ngei1a` di GitHub `vimax707/onlineexpress`.

## Melanjutkan dengan Claude

Buka Claude Code di folder `onlineexpress` lalu tulis permintaan langsung, misalnya:
*"Di Kantor AI, tambah divisi Keuangan warna hijau tua dengan karyawan Budi untuk file berisi kata laporan."*
Claude membaca `CLAUDE.md` di folder utama, yang mengarahkan ke rangkuman ini, jadi konteksnya tidak hilang.
