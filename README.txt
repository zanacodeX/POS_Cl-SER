Pixel Art POS Server Setup 2.0.0.exe
- Windows installer for the Pixel Art POS Server (Electron + Express + React)
- Installs MySQL backend + serves the web UI on port 3000
- First run: seeds admin (admin123) and cashier (cashier123) users
- Access from browser: http://localhost:3000
cd F:\Dev\posapp
node generate-license.js XX:XX:XX:XX:XX:XX
for developer
node deactivate-license.js <MAC>
port IPpc:3000

Prerequisites:
- MySQL must be installed and running (WAMP recommended)
- Server and client must be on the same network
