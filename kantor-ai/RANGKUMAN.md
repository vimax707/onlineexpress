# Rangkuman Kantor AI: Sriwijaya Andalan Perkasa

Catatan ini untuk melanjutkan pekerjaan: apa yang sudah dibuat, cara menjalankannya,
dan di mana mengubah tampilan atau susunan tim. Terakhir diperbarui 10 November 2026 (Riset digabung ke Teknik, bengkel elektro, Ruang Kontrol selebar kantor).

## Apa ini

Halaman web yang menampilkan kerja Claude Code sebagai kantor 3D. Setiap aksi Claude
(baca, tulis, edit, jalankan perintah, dll.) membuat monitor karyawan yang cocok menyala
dengan label kecil, misalnya `nulis · ide_konten.md`. Setelah Claude selesai menjawab,
Manager (Ena) merangkum giliran itu jadi satu laporan ke Bos (kamu).
Ada juga **Ruang Kontrol 24 jam** (6 PC, TV 65" dan 43") yang dijaga 2 orang per shift sesuai
jadwal Excel, diawasi Maya, serta **Ruang Istirahat** dan **Ruang Rekreasi** (terpisah) untuk operator
yang tidak bertugas.

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
| `pemetaan.js` | Aturan "aksi ini milik karyawan siapa", serah-terima ke petugas shift, dan kata kerja label. |
| `jadwal.js` | Membaca jadwal shift dari `jadwal.xlsx` (Excel) atau `jadwal.csv`, dan menentukan shift yang sedang berjalan. |
| `jadwal.xlsx` | **Jadwal shift Ruang Kontrol.** Buka di Excel, ubah, simpan. Ada dropdown nama dan sheet Petunjuk. |
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

Karyawan bertanda * adalah operator Ruang Kontrol tanpa meja divisi (`"meja": false`):
saat tidak bertugas mereka di Ruang Istirahat/Rekreasi.

| Ruangan | Karyawan | Mendapat aksi untuk |
|---|---|---|
| Umum & Dokumentasi (biru) | Wanda | file `.md`/`.txt` di folder utama (README) |
| | Flo | sisa file di folder utama |
| Teknik & Riset (hijau, bengkel elektro) | Bayu | `kantor-ai/public/`, `.html`, `.css` |
| | Ayu* | `.js`, `.json`, perintah shell |
| | Anis* | WebSearch, WebFetch, Grep, Glob |
| | Putri | alat MCP (Gmail, Vercel, …), Artifact, kirim file |
| | Nana* | sisa di `kantor-ai/` dan `.claude/` |
| | Wiwid* | penampung aksi yang tidak cocok di mana pun (`"cadanganKaryawan"`) |
| Pemasaran (merah muda) | Maya | nama file mengandung *iklan, ads, promo* |
| | Reza | nama file mengandung *konten, ide, caption, artikel* |
| | Diana | sisa di `pemasaran/` dan `konten/` |
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

## Tata letak ruangan

Diatur di `tim.json`, bagian `"tataLetak"`: daftar baris dari belakang ke depan, tiap baris berisi id ruang.
Id yang bisa dipakai: id divisi (`umum`, `teknik`, `pemasaran`), `kontrol`, `istirahat`, `rekreasi`, `bos`.
Ruang yang tidak disebut ditaruh di baris tambahan di depan, jadi tidak ada yang hilang. Simpan, dan kantor langsung berubah.

Susunan sekarang (dilihat dari depan, Ruang Bos paling dekat):

```
[ Ruang Kontrol (selebar kantor)                       ]
[ Umum ] [ Teknik & Riset (bengkel) ] [ Ruang Istirahat ]
[ Ruang Rekreasi ] [ Pemasaran ] [ Ruang Bos ]
```
Ruang Kontrol yang sendirian di barisnya otomatis melebar mengikuti baris terlebar.
Lebar tetap bisa dipaksa dengan `"lebar": 15` di bagian `"ruangKontrol"`.

## Ruang Kontrol & shift

Pengaturan di `tim.json`, bagian `"ruangKontrol"`. Jadwal di `kantor-ai/jadwal.xlsx`.

| Hal | Isi sekarang |
|---|---|
| Shift (jam komputer ini) | Pagi 07.00–15.00, Siang 15.00–23.00, Malam 23.00–07.00 (shift Malam ikut hari mulainya) |
| Per shift | 2 orang: 1 **Penanggung Jawab (PJ)** + 1 **Operator** |
| Operator (7) | Anis, Wiwid, Reza, Flo, Nana, Ayu, Diana |
| Bisa jadi PJ (4) | Wiwid, Flo, Diana, Anis |
| Pengawas | Maya (mejanya dipindah dari Pemasaran ke belakang operator di Ruang Kontrol) |
| Bentuk ruang | Meniru foto ruang kontrol asli: dinding jendela bertirai hijau mint, TV 65" di tengah, TV 43" di kiri pada tiang, 3 meja kayu dengan 6 PC berjajar, CPU dengan 3 kipas RGB di bawah meja, kursi kantor hitam, AC, rak jaringan, lantai keramik putih |
| Layar | PC 1–3 = Umum, Teknik & Riset, Pemasaran; PC 4 = semua aktivitas kantor → tampil di **TV 65"**; PC 5 = shift & petugas, PC 6 = laporan Manager → tampil di **TV 43"**. (Kalau divisi ada 4 atau lebih, PC 1–4 = 4 divisi pertama.) |
| Bengkel Teknik & Riset | 2 meja kerja elektro (Bayu, Putri): alas ESD, papan alat (obeng, tang, kunci), monitor, power supply kecil, stasiun solder, bor, multimeter, charger aki + aki di rak bawah. Angka power supply menyala hanya saat teknisinya bekerja. Diatur dengan `"ruangan": "bengkel"` di divisi. |

Cara kerjanya:
- Petugas shift duduk di Ruang Kontrol (operator di depan PC 1–3, PJ di depan PC 4–6).
  Operator lain yang tidak bertugas: 2 orang pertama main pingpong di Ruang Rekreasi (berdiri), sisanya duduk
  di Ruang Istirahat. Urutannya tetap (menurut daftar operator), bukan acak. Pergantian shift mengikuti jam komputer, dicek tiap 15 detik.
- Kalau Claude mengerjakan file milik operator yang sedang istirahat, pekerjaan itu **diambil petugas shift**
  dan tertulis "Reza (tugas Ayu)". Aksi yang berdampak di luar folder (⚠) yang jatuh ke operator selalu ditangani **PJ**.
  Karyawan yang bukan operator (Wanda, Bayu, Putri) tetap bekerja di mejanya.
- PC divisi menyala (bingkai hijau, kipas RGB CPU menyala) saat ada aksi di divisi itu. TV menampilkan isi PC-nya. Semua layar hanya
  digambar ulang saat ada aksi, laporan, atau pergantian shift.
- Kalau shift tertentu tidak ada petugasnya di jadwal, operator bekerja di meja divisinya seperti biasa.

Jadwal awal disusun acak (sekali, lalu disimpan) dengan aturan: tiap orang 6 shift per minggu,
paling banyak 1 shift sehari, tidak langsung dari Malam ke Pagi.

### Mengubah jadwal di Excel
1. Buka `kantor-ai\jadwal.xlsx`. Satu baris = satu shift pada satu hari (Hari, Shift, Jam, Penanggung Jawab, Operator).
2. Pilih nama dari dropdown, lalu simpan (Ctrl+S) tetap sebagai `.xlsx`.
3. Kantor membaca ulang dalam 1–2 detik. Salah ketik muncul sebagai kotak kuning **Catatan jadwal** di panel kanan.
- Bisa juga memakai `jadwal.csv` (pemisah `;` atau `,`) dengan kolom yang sama. Kalau keduanya ada, yang terakhir disimpan yang dipakai.
- Jam shift dan daftar nama diubah di `tim.json` (`"shift"`, `"operator"`, `"penanggungJawab"`, `"pengawas"`).

## Cara mengubah tampilan (`public/kantor.js` dan `public/gaya.css`)

| Yang diubah | Di mana |
|---|---|
| Warna lantai luar (sekarang abu-abu muda `#e4e6ea`) | `kantor.js`, `const lantai = …` |
| Warna latar di kejauhan | `kantor.js`, `adegan.background` |
| Warna lantai ruangan (warna divisi dicampur putih 82%) | `kantor.js`, `buatRuang`, `campur(warna, 0.82)` |
| Warna ruangan | `tim.json`, `"warna"` di tiap divisi |
| Jarak antar meja divisi | `kantor.js`, `pembangunDivisi`, `const JX = 2.3, JZ = 2.7` |
| Jarak antar ruangan | `kantor.js`, `bangunKantor`, `JARAK_X = 1.6, JARAK_Z = 2.3` |
| Warna baju Bos / Manager | `kantor.js`, `'#334155'` (Bos), `'#8b5cf6'` (Manager) |
| Warna layar monitor yang menyala | `kantor.js`, `LAYAR_NYALA` |
| Posisi awal kamera (otomatis memuat seluruh kantor) | `kantor.js`, `pasKamera()`, arah `new THREE.Vector3(0, 0.82, 0.57)` |
| Ukuran/letak TV 65" & 43" | `kantor.js`, `pembangunKontrol`, `buatTv(1.44, 0.81, …)` dan `buatTv(0.95, 0.534, …)` |
| Isi layar PC/TV | `kantor.js`, `gambarDivisi`, `gambarShift`, `gambarLaporan` |
| Susunan ruangan | `tim.json`, `"tataLetak"` (lihat bagian Tata letak) |
| Isi Ruang Kontrol (tirai, TV, meja, PC, kursi) | `kantor.js`, `pembangunKontrol` |
| Ruang Istirahat (sofa, meja kopi, bean bag) | `kantor.js`, `pembangunIstirahat` |
| Ruang Rekreasi (pingpong, bangku, mesin minuman) | `kantor.js`, `pembangunRekreasi` |
| Meja kerja elektro (power supply, bor, charger aki, …) | `kantor.js`, `buatMejaBengkel` |
| Warna kipas RGB | `kantor.js`, `WARNA_KIPAS` |
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
- **Sudah terbukti jalan di Windows** (D:\SAP\KantoAI\onlineexpress, Claude Code 2.1.318): hook mencatat,
  monitor menyala, dan laporan Manager muncul. `cek.bat` belum pernah dijalankan di sana.
- Hook versi lama (`$CLAUDE_PROJECT_DIR`) membuat kantor diam di Windows. Jangan kembalikan ke bentuk itu.
- Saat jadwal diubah, riwayat aksi lama ikut dihitung ulang memakai jadwal baru (siapa yang "bertugas"
  pada jam itu mengikuti isi jadwal terbaru).
- Ruang Kontrol diuji di Linux dengan jadwal buatan openpyxl. File `.xlsx` yang disimpan oleh Excel sungguhan
  di Windows belum diuji. Kalau terbaca salah, simpan sebagai CSV (`jadwal.csv`) sebagai jalan keluar.

## Riwayat perubahan

1. Hook pencatat aksi, server lokal, dan `tim.json`
2. Kantor 3D, panel aktivitas, laporan Manager, dan tanda ⚠
3. Tanda ⚠ hanya untuk perintah yang benar-benar dijalankan
4. Nama kantor *Sriwijaya Andalan Perkasa* (hitam, biru muda, kuning)
5. Ganti nama karyawan, lantai abu-abu muda
6. Alat jalankan (`jalankan.bat`, `jalankan.sh`) dan rangkuman ini
7. Hook tidak bergantung jenis terminal (perbaikan untuk Windows), `cek.bat` untuk pemeriksaan
8. Ruang Kontrol 24 jam (6 PC, TV 65" & 43", PJ + operator per shift, Maya pengawas),
   Ruang Istirahat & Rekreasi, jadwal shift dari Excel
9. Tata letak baru lewat `tataLetak`: Ruang Kontrol panjang di tempat Umum & Teknik, meniru foto ruang
   kontrol asli; Ruang Istirahat dan Rekreasi dipisah; Pemasaran di sebelah Ruang Bos
10. Riset digabung ke Teknik ("Teknik & Riset", bengkel elektro untuk Bayu & Putri), Ruang Kontrol
    melebar mengambil tempat Riset, PC 4 menampilkan semua aktivitas

Semua ada di branch `claude/practical-gauss-ngei1a` di GitHub `vimax707/onlineexpress`.

## Melanjutkan dengan Claude

Buka Claude Code di folder `onlineexpress` lalu tulis permintaan langsung, misalnya:
*"Di Kantor AI, tambah divisi Keuangan warna hijau tua dengan karyawan Budi untuk file berisi kata laporan."*
Claude membaca `CLAUDE.md` di folder utama, yang mengarahkan ke rangkuman ini, jadi konteksnya tidak hilang.
