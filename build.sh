#!/usr/bin/env bash
# Assemble the CrazyGames upload bundle as FLAT files (no subfolders).
set -e
cd "$(dirname "$0")"
rm -rf dist
mkdir -p dist
cp index.html style.css game.js menu_bg.jpg *.woff2 dist/
echo "Built dist/ — upload these 8 flat files:"
ls dist
