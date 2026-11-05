#!/usr/bin/env sh
# Kantor AI - jalankan kantor di Mac/Linux:  sh kantor-ai/jalankan.sh
cd "$(dirname "$0")/.." || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js belum terpasang. Unduh dan pasang dari https://nodejs.org lalu coba lagi."
  exit 1
fi
echo "Menjalankan Kantor AI... Browser akan terbuka sendiri."
exec node kantor-ai/server.js --buka
