@echo off
rem Kantor AI - pemeriksaan. Dobel-klik kalau kantor tetap diam saat Claude bekerja.
title Cek Kantor AI
cd /d "%~dp0.."
echo Folder proyek: %CD%
echo.

echo [1] Node.js
where node >nul 2>nul
if errorlevel 1 (
  echo     GAGAL: Node.js belum terpasang. Pasang dari https://nodejs.org
  goto selesai
)
for /f "delims=" %%v in ('node --version') do echo     OK: %%v

echo [2] Pengaturan hook
if exist ".claude\settings.json" (
  echo     OK: .claude\settings.json ada
) else (
  echo     GAGAL: .claude\settings.json tidak ada di folder ini
)

echo [3] Hook bisa menulis catatan (uji ke file sementara, tidak tampil di kantor)
set "KANTOR_LOG=%TEMP%\kantor-cek.jsonl"
if exist "%KANTOR_LOG%" del "%KANTOR_LOG%"
set "CLAUDE_PROJECT_DIR=%CD%"
echo {"hook_event_name":"Stop","session_id":"cek"} | node -e "try{require(require('path').join(process.env.CLAUDE_PROJECT_DIR||process.cwd(),'kantor-ai','hook.js'))}catch(e){console.log(e.message)}"
if exist "%KANTOR_LOG%" (
  echo     OK: hook berjalan
) else (
  echo     GAGAL: hook tidak menulis apa pun
)
del "%KANTOR_LOG%" 2>nul
set "KANTOR_LOG="

echo [4] Catatan dari Claude
if exist "kantor-ai\data\aktivitas.jsonl" (
  for /f %%n in ('find /c /v "" ^< "kantor-ai\data\aktivitas.jsonl"') do echo     Ada %%n baris aksi tercatat
) else (
  echo     Belum ada catatan. Claude belum mencatat aksi apa pun di folder ini.
  echo     - Pastikan claude dijalankan dari folder: %CD%
  echo     - Tutup Claude lalu buka lagi, supaya hook baru terbaca
  echo     - Di Claude ketik /hooks dan pastikan ada PreToolUse, Stop, UserPromptSubmit
)

echo [5] Server kantor
node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||4777)+'/api/status',r=>{console.log(r.statusCode===200?'    OK: kantor sedang jalan':'    GAGAL: status '+r.statusCode)}).on('error',()=>console.log('    Belum jalan: dobel-klik kantor-ai\\jalankan.bat'))"

:selesai
echo.
echo Salin semua tulisan di atas kalau perlu bantuan.
pause
