#!/usr/bin/env bash
# 重新构建 bundle.js 与 app.css（仅在你修改了 src/ 里的代码后才需要运行）。
# Rebuild bundle.js and app.css from the source in src/. Requires Node.js.
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
  echo "==> Installing dependencies (npm install)…"
  npm install --no-audit --no-fund
fi

echo "==> Bundling JavaScript (React + motion + game) → bundle.js"
./node_modules/.bin/esbuild src/entry.tsx \
  --bundle --minify --format=iife --jsx=automatic --target=es2020 \
  --define:process.env.NODE_ENV='"production"' \
  --outfile=bundle.js

echo "==> Building CSS (Tailwind) → app.css"
./node_modules/.bin/tailwindcss -i src/index.css -o app.css --minify

echo "==> Done. 用本地服务器打开 index.html，例如： python3 -m http.server 8000"
