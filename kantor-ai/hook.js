#!/usr/bin/env node
// Hook Claude Code untuk Kantor AI.
// Mencatat SATU baris per aksi ke kantor-ai/data/aktivitas.jsonl.
// Yang dicatat: waktu, jenis hook, nama alat, nama file/folder yang disentuh,
// dan label "aksi luar" (mis. "git push") bila ada.
// Yang TIDAK dicatat: isi file, isi perintah, isi prompt.
// Hook ini selalu keluar dengan kode 0 dan tidak menulis apa pun ke stdout,
// jadi tidak pernah memblokir atau mengubah kerja Claude.
'use strict';
const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, 'data');
const LOG_FILE = path.join(LOG_DIR, 'aktivitas.jsonl');

// Alat yang mengubah file.
const ALAT_UBAH = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);

// Pola perintah shell yang berdampak di luar folder ini.
// Perintah hanya dibaca di memori untuk dicocokkan; yang disimpan hanya labelnya.
const POLA_BASH = [
  [/\bgit\s+push\b/, 'git push'],
  [/\b(vercel|netlify|firebase|fly|wrangler|heroku|railway)\b[^|;&]*\bdeploy\b|\bvercel\s+(--prod|deploy)\b|\bdeploy\b/, 'deploy'],
  [/\b(sendmail|mailx?|mutt|msmtp|swaks)\b/, 'kirim email'],
  [/\b(npm|pnpm|yarn)\s+publish\b|\bcargo\s+publish\b|\btwine\s+upload\b/, 'publish paket'],
  [/\bgh\s+(pr|issue|release|repo)\s+(create|merge|close|edit|delete|comment)\b/, 'ubah GitHub'],
  [/\bcurl\b[^|;&]*(-X\s*(POST|PUT|PATCH|DELETE)|--data\b|-d\s|-F\s|--form\b)/i, 'kirim data ke internet'],
  [/\b(docker|kubectl|terraform)\s+(push|apply|delete|destroy)\b/, 'ubah infrastruktur'],
];

// Bagian nama alat MCP yang menandakan perubahan di layanan luar.
const POLA_MCP_UBAH = /(^|_|-)(create|send|update|delete|deploy|publish|post|write|push|merge|trash|label|unlabel|schedule|upload|cancel|add|remove|edit|set|execute|run|fire|archive|unarchive|buy|transfer|promote|rollback|approve|mark|reply|respond|move|copy|duplicate|restore|stop|install|activate|revoke|assign|invalidate|pause|unpause|mutate|enable|disable|resolve|submit|record|patch|replace|stage|issue|kill|generate|import|comment|spawn)(_|-|$)/i;

function relatif(p, root) {
  if (!p || typeof p !== 'string') return null;
  const abs = path.resolve(root, p);
  const rel = path.relative(root, abs);
  if (rel === '') return { file: '.', luarFolder: false };
  if (rel.startsWith('..') || path.isAbsolute(rel)) return { file: abs, luarFolder: true };
  return { file: rel.split(path.sep).join('/'), luarFolder: false };
}

function catat(input) {
  const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
  const ev = input.hook_event_name;
  const baris = {
    ts: Date.now(),
    event: ev,
    sesi: typeof input.session_id === 'string' ? input.session_id.slice(0, 8) : null,
  };

  if (ev === 'PreToolUse') {
    const tool = String(input.tool_name || '?');
    const ti = input.tool_input && typeof input.tool_input === 'object' ? input.tool_input : {};
    baris.tool = tool;
    const p = ti.file_path || ti.notebook_path || ti.path || null;
    const r = relatif(p, root);
    if (r) baris.file = r.file;

    let luar = null;
    if (r && r.luarFolder && ALAT_UBAH.has(tool)) luar = 'ubah file di luar folder';
    if (tool === 'Bash' && typeof ti.command === 'string') {
      for (const [re, label] of POLA_BASH) if (re.test(ti.command)) { luar = label; break; }
      // Kirim data hanya ke komputer ini (localhost) bukan aksi luar.
      if (luar === 'kirim data ke internet') {
        const url = ti.command.match(/https?:\/\/[^\s'"]+/g) || [];
        if (url.length && url.every((u) => /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])([:/]|$)/.test(u))) luar = null;
      }
    }
    if (tool.startsWith('mcp__')) {
      const parts = tool.split('__');
      const aksi = parts.slice(2).join('__');
      const layanan = (parts[1] || 'luar').replace(/^plugin_[^_]+_/, '').replace(/^claude_ai_/, '');
      if (/gmail|mail/i.test(layanan) && /(^|_)send/i.test(aksi)) luar = 'kirim email';
      else if (/deploy/i.test(aksi)) luar = 'deploy ' + layanan;
      else if (POLA_MCP_UBAH.test(aksi)) luar = 'ubah layanan ' + layanan;
    }
    if (tool === 'Artifact') {
      const a = ti.action || 'publish';
      if (a === 'publish' || a === 'delete') luar = a + ' artifact';
    }
    if (tool === 'PushNotification' || tool === 'SendUserFile') luar = 'kirim ke perangkat';
    if (luar) baris.luar = luar;
  }
  // UserPromptSubmit & Stop: hanya penanda waktu, isi prompt tidak disentuh.

  fs.mkdirSync(LOG_DIR, { recursive: true });
  fs.appendFileSync(LOG_FILE, JSON.stringify(baris) + '\n');
}

let buf = '';
const selesai = () => {
  try { catat(JSON.parse(buf || '{}')); } catch (_) { /* jangan pernah gagal */ }
  process.exit(0);
};
// Jaga-jaga: kalau stdin tidak ditutup, berhenti sendiri setelah 1,5 detik.
setTimeout(() => process.exit(0), 1500).unref();
process.stdin.setEncoding('utf8');
process.stdin.on('data', (d) => { buf += d; if (buf.length > 5e6) buf = buf.slice(0, 5e6); });
process.stdin.on('end', selesai);
process.stdin.on('error', () => process.exit(0));
