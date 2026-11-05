@echo off
rem Kantor AI - dobel-klik file ini untuk menjalankan kantor di Windows.
title Kantor AI
cd /d "%~dp0.."
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js belum terpasang. Unduh dan pasang dari https://nodejs.org lalu coba lagi.
  pause
  exit /b 1
)
echo Menjalankan Kantor AI... Browser akan terbuka sendiri.
echo Tutup jendela ini untuk mematikan kantor.
echo.
node kantor-ai\server.js --buka
pause
