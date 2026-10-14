#!/bin/bash
# Kaku setup for macOS and Linux. Double-click on a Mac, or run ./install.command
cd "$(dirname "$0")" || exit 1

echo
echo "  Kaku"
echo "  ===="
echo

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "  Node.js is not installed, and Kaku needs it to run."
  echo "  Opening nodejs.org. Install the LTS version, then run this again."
  echo
  (command -v open >/dev/null && open "https://nodejs.org/en/download") || \
  (command -v xdg-open >/dev/null && xdg-open "https://nodejs.org/en/download") || \
  echo "  https://nodejs.org/en/download"
  read -r -p "  Press Enter to close. "
  exit 1
fi

echo "  Node $(node -v) found."
echo "  Installing. The first run downloads Electron, around 100 MB."
echo

if ! npm install --no-audit --no-fund; then
  echo
  echo "  That failed. Usually it is no internet, or a VPN or firewall blocking npm."
  read -r -p "  Press Enter to close. "
  exit 1
fi

echo
echo "  Done."
echo
echo "    1)  Start Kaku now"
echo "    2)  Build an app bundle (dist/)"
echo "    3)  Both"
echo "    4)  Finish here"
echo
read -r -p "  Choose 1-4 (or press Enter for 1): " choice
choice=${choice:-1}

build() {
  echo
  echo "  Building. This takes a few minutes."
  if [ "$(uname)" = "Darwin" ]; then npm run dist:mac; else npm run dist; fi
  echo
  echo "  Built. Look in the dist folder."
}

case "$choice" in
  2) build ;;
  3) build; npm start ;;
  4) ;;
  *) echo; echo "  Starting Kaku. Next time you can run ./start.sh"; npm start ;;
esac
