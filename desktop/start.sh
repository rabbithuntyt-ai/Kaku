#!/bin/bash
cd "$(dirname "$0")" || exit 1
[ -d node_modules ] || npm install --no-audit --no-fund
npm start
