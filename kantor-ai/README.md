# Kantor AI

Kantor 3D yang menampilkan apa yang sedang dikerjakan Claude Code di project ini.
Semua yang tampil berasal dari hook Claude Code. Tidak ada aktivitas acak: kalau
Claude sedang tidak bekerja, kantornya diam.

## Menjalankan

Windows: dobel-klik `kantor-ai\jalankan.bat`. Mac/Linux: `sh kantor-ai/jalankan.sh`.
Browser terbuka sendiri. Bisa juga manual:

```bash
node kantor-ai/server.js
```

Rangkuman lengkap untuk melanjutkan pekerjaan ada di `RANGKUMAN.md`.

Buka http://127.0.0.1:4777. Server hanya mendengar di `127.0.0.1` dan menolak
permintaan dengan Host selain `localhost`/`127.0.0.1`. Port bisa diganti: `PORT=5000 node kantor-ai/server.js`.

Hook sudah terpasang lewat `.claude/settings.json`, jadi catatan tetap terkumpul
walau server sedang mati. Saat server dinyalakan, riwayat dibaca ulang dari catatan.

## Alurnya

1. **Hook** (`hook.js`) dipanggil Claude Code pada `UserPromptSubmit`, `PreToolUse`, dan `Stop`.
   Satu baris JSON ditambahkan ke `data/aktivitas.jsonl` (diabaikan git):
   waktu, jenis hook, 8 karakter awal id sesi, nama alat, nama file/folder yang disentuh.
   Isi file, isi perintah, dan isi prompt **tidak** dicatat. Hook selalu keluar dengan
   kode 0, tidak menulis ke stdout, dan berhenti sendiri setelah 1,5 detik bila macet.
2. **Tanda luar**: hook memberi label pada aksi yang berdampak di luar folder ini,
   misalnya `git push`, `deploy`, `kirim email`, mengubah file di luar folder project,
   atau alat MCP yang mengubah layanan luar (create/send/update/deploy/…).
   Untuk perintah shell, isi perintah hanya dicocokkan di memori; yang disimpan hanya labelnya.
   Pola hanya dicocokkan di awal tiap perintah (setelah `;`, `&&`, `|`, baris baru), sehingga teks
   di dalam tanda kutip atau heredoc, misalnya `git commit -m "nanti git push"`, tidak ikut ditandai.
   Ini pencocokan pola, jadi bisa terlewat atau salah tanda. Lihat `POLA_BASH` di `hook.js`.
3. **Server** (`server.js`, Node murni) membaca catatan tiap 250 ms, memetakan aksi ke
   karyawan menurut `tim.json`, lalu mengirimnya ke browser lewat Server-Sent Events.
   Pada `Stop`, Manager merangkum semua aksi giliran itu (siapa mengerjakan apa).
4. **Halaman** (`public/`) menggambar kantor dengan Three.js (disimpan di `public/vendor`,
   jadi tidak perlu internet). Karyawan yang sedang bekerja: monitor menyala, lampu meja hijau,
   dan label kecil berisi kerjaannya. Karyawan yang sudah bekerja di giliran ini: monitor redup.
   Saat giliran selesai, semua monitor mati dan Manager berjalan ke meja Bos untuk melapor.

## Ruang Kontrol & jadwal shift

Ruang Kontrol dijaga 2 orang per shift (PJ + operator) sesuai `jadwal.xlsx`, yang bisa diedit di Excel.
Penjelasan lengkap ada di `RANGKUMAN.md`, bagian *Ruang Kontrol & shift*.

## Mengatur tim (`tim.json`)

Server memuat ulang file ini otomatis saat disimpan.

- `kantor.nama`: nama kantor di pojok kiri atas dan judul tab, per kata dengan warnanya sendiri,
  misalnya `{ "teks": "Andalan", "warna": "#38bdf8" }`.

- `divisi[].folder`: folder (diakhiri `/`) atau file milik divisi. Folder terpanjang yang cocok menang.
- `divisi[].karyawan[].aturan`: dicek berurutan, karyawan pertama yang cocok mendapat aksinya.
  - `namaMengandung`: kata di nama file, misalnya `["iklan"]`
  - `ekstensi`: misalnya `[".md"]`
  - `folder`: subfolder
  - `alat`: nama alat Claude, boleh diakhiri `*` (misalnya `"mcp__*"`)
  - `semua`: penampung semua aksi di divisi itu
- Aksi tanpa folder yang cocok dicarikan karyawan dengan aturan `alat`/nama yang pas di divisi mana pun,
  dan kalau tetap tidak ada, masuk ke divisi `cadangan`.

Isi awal disusun dari isi project saat ini (`README.md`, `kantor-ai/`, `.claude/`).
Divisi Pemasaran (`pemasaran/`, `konten/`) adalah contoh untuk folder yang belum ada. Silakan ubah.

## Membersihkan catatan

Hapus `kantor-ai/data/aktivitas.jsonl`. Server akan mulai dari kosong.
