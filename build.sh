#!/usr/bin/env bash
# Build the CrazyGames upload bundle: only the files the game needs.
set -e
cd "$(dirname "$0")"
rm -rf dist zombiemall.zip
mkdir -p dist/fonts
cp index.html style.css game.js menu_bg.jpg dist/
cp fonts/*.woff2 dist/fonts/
cd dist
# zip if available; otherwise leave the dist/ folder to zip manually
if command -v zip >/dev/null 2>&1; then
  zip -r ../zombiemall.zip . >/dev/null
  echo "Built dist/ and zombiemall.zip"
else
  echo "Built dist/ (no 'zip' tool found — zip the dist/ folder contents manually)"
fi
