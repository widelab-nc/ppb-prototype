#!/usr/bin/env bash
# ============================================================
# Serwer do podglądu barba-site/ — WIELOWĄTKOWY. To nie jest wygoda.
#
# `python3 -m http.server` jest JEDNOWĄTKOWY: obsługuje jedno żądanie naraz.
# Home ciągnie ~23 MB wideo (preload="auto") + 32 PNG sekwencji, więc XHR Barby
# po kolejną stronę czekał w kolejce za strumieniem wideo i przekraczał limit
# 2 s → Barba po cichu robiła `window.location.assign()` = pełne przeładowanie.
# Objawiało się to loaderem na home i mruganiem nava na about.
#
# ThreadingHTTPServer obsługuje żądania równolegle i problem znika u źródła.
# (W transition.js limit podniesiony do 20 s — pas bezpieczeństwa, nie zamiennik.)
#
# Użycie:  bash barba-site/serve.sh        (odpalane z katalogu _code/)
#          → http://localhost:8000/barba-site/
# ============================================================
set -e
cd "$(dirname "$0")/.."      # → _code/
PORT="${1:-8000}"
echo "Serwuję $(pwd) na http://localhost:${PORT}/barba-site/  (Ctrl+C kończy)"
python3 -c "
import sys
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
class H(SimpleHTTPRequestHandler):
    def end_headers(self):
        # zero cache — inaczej podbijanie ?v= w kółko myli podgląd
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()
ThreadingHTTPServer(('', int(sys.argv[1])), H).serve_forever()
" "$PORT"
