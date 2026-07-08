# Deployment Guide — Pixel Art POS

This guide explains how to run the POS system on a local network so multiple devices can use it.

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  SERVER PC                       │
│  (Windows + WAMP + Pixel Art POS)               │
│                                                  │
│  ┌──────────┐    ┌──────────┐                   │
│  │  MySQL    │◄───│ Backend  │                   │
│  │ (WAMP)    │    │ :3000    │                   │
│  └──────────┘    └────┬─────┘                   │
│                       │ Serves SPA              │
│                       ▼                         │
│              ┌──────────────────┐               │
│              │  Built Frontend   │               │
│              │  (React SPA)      │               │
│              └──────────────────┘               │
└─────────────────────┬───────────────────────────┘
                      │ LAN (WiFi / Ethernet)
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
   ┌────────┐  ┌────────┐  ┌──────────────┐
   │Browser │  │Browser │  │Electron App  │
   │(Admin) │  │(Cashier)│  │(Client Mode) │
   └────────┘  └────────┘  └──────────────┘
   Any device   Any device   Installed PC
   (Phone,       (Tablet,     (--server flag)
    Laptop)       Laptop)
```

---

## Step 1: Prepare the Server PC

This is the PC connected to your network (WiFi or Ethernet cable) that will host the backend and database.

### 1.1 Install WAMP
- Download & install WAMP from https://www.wampserver.com
- Start WAMP (green icon in system tray)
- Make sure MySQL is running

### 1.2 Create the Database
- Open phpMyAdmin: http://localhost/phpmyadmin
- Click **New** → Database name: `pos_system` → Create
- Open the SQL tab and paste the contents of `backend/schema.sql` → Go
- (Or run `npm run seed` after setting up the app)

### 1.3 Install the POS App
- Run `dist/Pixel Art POS Setup 2.0.0.exe` on the server PC
- Or run from source: `npm run server` in the `posapp` folder

---

## Step 2: Find the Server PC's LAN IP

```cmd
ipconfig
```

Look for:
- **WiFi**: `IPv4 Address . . . . . : 192.168.x.x` (under your WiFi adapter)
- **Ethernet**: `IPv4 Address . . . . . : 192.168.x.x` (under Ethernet adapter)

Write this IP down. Example: `192.168.1.100`

---

## Step 3: Start the Server

### Option A: Using the installed app (double-click)
- Run **Pixel Art POS** from the Start Menu / Desktop
- The server starts automatically at **http://localhost:3000**
- Note: the built-in server mode runs the backend on the same PC

### Option B: Using terminal (better for dedicated server)
```cmd
cd C:\Program Files\Pixel Art POS\resources
npm run server
```

You'll see:
```
Server running on:
  Local:    http://localhost:3000
  Network:  http://192.168.1.100:3000
```

The backend is now accessible from any device on your LAN.

---

## Step 4: Access from Other Devices

### 4.1 Via Web Browser (simplest — no install needed)

On any phone, tablet, or laptop connected to the same network:

1. Open Chrome / Firefox / Edge
2. Go to: `http://192.168.1.100:3000`
3. Login with:
   - **Admin**: `admin` / `admin123`
   - **Cashier**: `cashier` / `cashier123`

That's it. No app installation needed for cashier tablets or phones.

### 4.2 Via Installed Electron App (client mode)

On a PC where you installed the app:

1. Create a shortcut to `Pixel Art POS.exe`
2. Right-click → Properties → Target, add `--server http://192.168.1.100:3000`
   ```
   "C:\Program Files\Pixel Art POS\Pixel Art POS.exe" --server http://192.168.1.100:3000
   ```
3. Double-click — it opens an Electron window pointing to the server

Alternatively, run from command line:
```cmd
"C:\Program Files\Pixel Art POS\Pixel Art POS.exe" --server http://192.168.1.100:3000
```

---

## Firewall Notes

Windows may block port 3000. Allow it:

1. Open **Windows Defender Firewall** → Advanced Settings
2. **Inbound Rules** → New Rule → Port
3. TCP → Specific local ports: `3000` → Allow the connection
4. Apply to all profiles → Name: "Pixel Art POS"

---

## Multi-Terminal Setup Examples

### Small Shop (2-3 devices)
```
Server PC (runs WAMP + backend)
  ├── Laptop at counter → http://192.168.1.100:3000 (browser)
  └── Tablet for admin  → http://192.168.1.100:3000 (browser)
```

### Print Shop (4-6 devices)
```
Server PC (runs WAMP + backend, in back office)
  ├── POS terminal 1  → Electron app (--server flag)
  ├── POS terminal 2  → Electron app (--server flag)
  ├── Admin laptop    → browser
  ├── Cashier tablet  → browser
  └── Customer display → browser (read-only dashboard)
```

### Multiple Branches (remote access)
- Not supported directly (LAN only)
- For remote access, set up a VPN (e.g., Tailscale, ZeroTier) to connect branches into one virtual LAN

---

## Configuration Reference

| Setting | File | Default | Notes |
|---------|------|---------|-------|
| Backend port | `backend/.env` | `3000` | Change if port conflicts |
| MySQL host | `backend/.env` | `localhost` | Keep as localhost (DB runs on server PC) |
| JWT secret | `backend/.env` | `pixel-pos-jwt-secret-2026` | Change in production |
| Server bind | `backend/server.js` | `0.0.0.0` (all interfaces) | Already listens on all IPs |

---

## Troubleshooting

**"Cannot connect to server"**
- Verify server PC is running (`npm run server` or the app)
- Check the IP address: `ipconfig` on the server PC
- Test from another device: `ping 192.168.1.100`
- Try in browser: `http://192.168.1.100:3000`
- Check firewall: allow port 3000 inbound

**"MySQL connection refused"**
- Make sure WAMP is running (green icon)
- WAMP → MySQL → Service administration → Start/Resume service

**Blank page in browser**
- Make sure you used `http://` not `https://`
- Make sure the frontend was built: run `npm run build:frontend` in the posapp folder
