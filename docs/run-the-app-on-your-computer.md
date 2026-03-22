# Run the Earlymark app on your computer

Use this when you want to open **http://localhost:3000** and work on the site.

## Easiest way (Windows)

1. In File Explorer, go to your project folder: **Assistantbot** (the same folder that has `package.json`).
2. **Double‑click** the file **`Start-local-website.bat`**.
3. A black window will open and stay open — that is normal.
4. Wait until you see text like **Ready** and **localhost:3000**.
5. Open your web browser and go to: **http://localhost:3000**

**Important:** Do not close the black window while you are using the site. If you close it, the site will stop loading until you run the batch file again.

## If the double‑click file does not work

1. Open **Cursor** (or VS Code) with this project.
2. Open a **terminal** (menu: Terminal → New Terminal).
3. Type **`npm run dev`** and press **Enter**.
4. Wait for **Ready**, then open **http://localhost:3000** in the browser.

## If the browser says it cannot connect

- The local server is probably not running. Start it again using one of the two ways above.
- Make sure nothing else is already using port **3000** (only one app can use that port at a time).
