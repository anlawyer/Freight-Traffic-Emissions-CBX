# Troubleshooting: "I don't see all the content"

## Quick Diagnosis

### Step 1: Test Simple Version First

Open the test page to verify React embedding works:

```
http://localhost:8080/test-embedded.html
```

**Expected:** You should see a purple hero section, then when you scroll down or click button, you see the React ML Dashboard.

**If test page works:** The issue is with the full `index.html` integration (CSS conflicts, etc.)
**If test page fails:** There's a fundamental issue with the React build or paths.

---

## Common Issues

### Issue 1: "I only see the hero section"

**Symptom:** Page loads but stops after the title/mapbox section.

**Cause:** You haven't scrolled down yet! The React app is below the scrollytelling content.

**Fix:**
1. Click the **"🧠 View ML Dashboard"** button (should smooth scroll)
2. OR manually scroll all the way to the bottom
3. You should see a loading spinner, then the React dashboard

---

### Issue 2: "I see loading spinner forever"

**Symptom:** You scrolled down and see "Loading ML Dashboard..." but it never loads.

**Cause:** React bundle failed to load or execute.

**Fix:**

1. **Open browser console** (F12 → Console tab)
2. **Look for errors** like:
   - `Failed to load resource: net::ERR_FILE_NOT_FOUND` → Path issue
   - `Uncaught SyntaxError` → Build issue
   - `Uncaught ReferenceError: React is not defined` → Bundle issue

3. **Check file paths:**
   ```bash
   # Verify these files exist:
   ls frontend/build/static/js/main.c1850014.js
   ls frontend/build/static/css/main.b5b782c9.css
   ```

4. **Rebuild React app:**
   ```bash
   cd frontend
   npm run build
   # Note the new hash in output
   # Update index.html line 183 with new hash
   ```

---

### Issue 3: "Page is blank / white screen"

**Symptom:** Nothing loads at all.

**Cause:** Mapbox API key issue or JavaScript error blocking page load.

**Fix:**

1. **Check browser console** for errors
2. **Check if Mapbox loaded:**
   - You should see a map in the background
   - If not, check `script.js` for Mapbox token
3. **Try disabling Mapbox temporarily:**
   - Comment out line 178 in `index.html`:
     ```html
     <!-- <script src="script.js"></script> -->
     ```
   - Refresh page

---

### Issue 4: "React app shows but looks broken"

**Symptom:** Dashboard loads but styling is wrong or components are missing.

**Cause:** CSS not loaded or conflicting styles.

**Fix:**

1. **Verify CSS loaded:**
   - Open DevTools → Network tab
   - Look for `main.b5b782c9.css`
   - Should show status 200 (not 404)

2. **Check CSS path:**
   ```html
   <!-- Line 184 in index.html -->
   <link rel="stylesheet" href="frontend/build/static/css/main.b5b782c9.css">
   ```

3. **Check for CSS conflicts:**
   - Open DevTools → Elements tab
   - Inspect a broken element
   - Look for conflicting styles from `style.css` overriding React styles

---

### Issue 5: "Backend errors in console"

**Symptom:** React loads but shows errors like "Failed to fetch" or "Network error"

**Cause:** Backend not running or CORS issues.

**Fix:**

1. **Start backend:**
   ```bash
   cd backend
   python main.py

   # Should see:
   # INFO: Uvicorn running on http://127.0.0.1:8000
   ```

2. **Test backend manually:**
   ```bash
   curl http://127.0.0.1:8000/baseline
   # Should return JSON with baseline data
   ```

3. **Check CORS settings** in `backend/main.py`:
   ```python
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["*"],  # Should allow all origins
       ...
   )
   ```

---

## Detailed Debugging Steps

### Step 1: Verify Server is Running

```bash
# Terminal 1: Backend
cd backend
python main.py

# Terminal 2: Frontend server
cd ..  # Back to root
python -m http.server 8080
```

**Check:**
- Backend should show: `Uvicorn running on http://127.0.0.1:8000`
- Frontend should show: `Serving HTTP on 0.0.0.0 port 8080`

---

### Step 2: Open Page with DevTools

1. Open browser
2. Press F12 to open DevTools
3. Go to `http://localhost:8080/index.html`
4. Watch Console tab for errors

**Common errors and fixes:**

| Error | Meaning | Fix |
|-------|---------|-----|
| `GET http://localhost:8080/frontend/build/static/js/main.c1850014.js net::ERR_ABORTED 404` | File not found | Check path, rebuild React |
| `Uncaught SyntaxError: Unexpected token '<'` | JS file contains HTML (404 page) | Fix path to JS bundle |
| `Failed to fetch http://127.0.0.1:8000/baseline` | Backend not running | Start backend |
| `Access to fetch at 'http://127.0.0.1:8000' ... blocked by CORS` | CORS issue | Check backend CORS middleware |

---

### Step 3: Check Network Tab

1. DevTools → Network tab
2. Refresh page (Ctrl+R)
3. Look for files:

**Should load:**
- ✅ `index.html` (status 200)
- ✅ `script.js` (status 200)
- ✅ `style.css` (status 200)
- ✅ `main.c1850014.js` (status 200)
- ✅ `main.b5b782c9.css` (status 200)

**If any show 404:**
- Check file paths in `index.html`
- Verify files exist in `frontend/build/static/`

---

### Step 4: Check React Mount

Open Console and run:

```javascript
// Check if React root element exists
console.log(document.getElementById('react-root'));

// Check if React rendered
console.log(document.getElementById('react-root').children.length);
// Should be > 0 after React mounts
```

---

## Manual Testing Checklist

Run through this checklist:

- [ ] Backend running on port 8000
- [ ] Frontend server running on port 8080
- [ ] Browser open to `http://localhost:8080/index.html`
- [ ] Browser DevTools open (F12)
- [ ] No errors in Console tab
- [ ] No 404s in Network tab
- [ ] Can see hero section with title
- [ ] Can scroll through scrollytelling content (5 steps)
- [ ] Can scroll to bottom and see loading spinner
- [ ] Loading spinner disappears after 1-2 seconds
- [ ] React dashboard appears with header
- [ ] Can see all 4 tabs: Overview, ML Prediction, Comparison, Model Info
- [ ] Clicking "Run Both Predictions" works

---

## Still Not Working?

### Option 1: Use Standalone React App

Instead of embedding, just run React separately:

```bash
cd frontend
npm start
# Opens http://localhost:3000
```

Then update the button in `index.html` to open it:

```html
<a href="http://localhost:3000" target="_blank">
  Open ML Dashboard →
</a>
```

---

### Option 2: Simplify the Integration

If there are CSS conflicts, try isolating React in an iframe:

```html
<!-- Replace the embedded div with iframe -->
<iframe
  src="http://localhost:3000"
  style="width: 100%; height: 100vh; border: none;"
></iframe>
```

---

## Debug Output

When reporting issues, provide:

1. **Browser console errors** (copy/paste)
2. **Network tab 404s** (screenshot)
3. **Output of:**
   ```bash
   ls -la frontend/build/static/js/
   ls -la frontend/build/static/css/
   ```
4. **Browser and version** (e.g., Chrome 120, Firefox 121)

---

## Quick Fix Script

If you just want it working quickly:

```bash
#!/bin/bash

# Clean rebuild everything
cd frontend
rm -rf build node_modules
npm install
npm run build

# Start servers
cd ../backend
python main.py &

cd ..
python -m http.server 8080 &

echo "✓ Servers started"
echo "Open http://localhost:8080/index.html"
```

---

## Most Likely Issue

Based on "I don't see all the content", the most likely issue is:

**You haven't scrolled down far enough!**

The React app is positioned AFTER:
1. Hero section (full screen)
2. Scrollytelling step 1 (The Corridor)
3. Scrollytelling step 2 (Environmental Impact)
4. Scrollytelling step 3 (Community Vulnerability)
5. Scrollytelling step 4 (Priority Zone)
6. Scrollytelling step 5 (Traffic & Asthma)

Then FINALLY the React app appears.

**Solution:** Click the "🧠 View ML Dashboard" button to smooth scroll directly to it!
