@echo off
REM === Pixel Art POS Client Launcher ===
REM Change this to your server's IP address
set SERVER_URL=http://localhost:3000

start "" "%~dp0Pixel Art POS Client.exe" --server %SERVER_URL%
