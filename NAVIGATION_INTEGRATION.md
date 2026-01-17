# Navigation Integration Between Pages

## Overview

Added bidirectional navigation between the two parts of your hackathon project:
1. **Root Story Page** (`index.html`) - Scrollytelling visualization
2. **ML Dashboard** (`frontend/`) - React app with LSTM predictions

## Changes Made

### 1. Root Page → ML Dashboard Link

**File:** [index.html:34-46](index.html#L34-L46)

Added a prominent button on the hero section to access the ML Dashboard:

```html
<!-- Link to ML Dashboard -->
<div class="mt-12">
    <a href="http://localhost:3000"
       target="_blank"
       class="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-green-500 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200">
        <span>🧠 Open ML Dashboard</span>
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
        </svg>
    </a>
    <p class="text-xs text-gray-400 mt-3">LSTM Neural Network Traffic Flow Prediction</p>
</div>
```

**Features:**
- Gradient button (blue → green) matching the ML theme
- Arrow icon for clear call-to-action
- Opens in new tab (`target="_blank"`)
- Hover animation (scale + shadow)
- Descriptive subtitle

**Location:** Appears below the main hero text "15 miles. 200,000 trucks..."

---

### 2. ML Dashboard → Root Page Link

**File:** [frontend/src/App.js:529-554](frontend/src/App.js#L529-L554)

Added a "Back to Story" button in the header next to the language toggle:

```jsx
{/* Back to Story Button */}
<a
  href="../index.html"
  style={{
    padding: '8px 16px',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  }}
  onMouseOver={(e) => {
    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
  }}
  onMouseOut={(e) => {
    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
  }}
>
  ← Back to Story
</a>
```

**Features:**
- Glassmorphism design (semi-transparent white)
- Matches header gradient background
- Hover state brightens background
- Left arrow (←) for visual direction
- Positioned next to EN/ES language toggle

**Location:** Top-right header, before language selector

---

## Visual Design

### Root Page Button
```
┌─────────────────────────────────────────────┐
│                                             │
│   CROSS BRONX                               │
│   Concrete Severance                        │
│   Recalibrating the Cross Bronx Corridor    │
│                                             │
│   15 miles. 200,000 trucks. One heavy...    │
│                                             │
│   ┌───────────────────────────────────┐    │
│   │  🧠 Open ML Dashboard        →   │    │
│   └───────────────────────────────────┘    │
│   LSTM Neural Network Traffic Flow...       │
│                                             │
└─────────────────────────────────────────────┘
```

### ML Dashboard Header
```
┌─────────────────────────────────────────────────────┐
│  Urban Futures LEAP                  ← Back to Story │ EN / ES │
│  Freight Tax Impact Model                           │
│  📍 Soundview, Bronx                               │
└─────────────────────────────────────────────────────┘
```

---

## User Flow

### Presentation Flow for Judges

**Recommended order:**

1. **Start at Root Page** (`index.html`)
   - Show scrollytelling visualization
   - Explain the problem (freight traffic, pollution, health impacts)
   - Scroll through all 5 steps:
     1. The Corridor (freight routes)
     2. Environmental Impact (park access)
     3. Community Vulnerability (asthma rates)
     4. Priority Zone (heat vulnerability)
     5. The Incision (traffic & asthma correlation)

2. **Click "Open ML Dashboard"**
   - Transitions to technical solution
   - Show LSTM model predictions
   - Demonstrate 50mph vs 60mph scenarios

3. **Use "Back to Story"** if needed
   - Return to visualization context
   - Show how data informs the model

---

## Technical Details

### URL Structure

**Development:**
- Root Page: `file:///path/to/index.html` or via live server
- ML Dashboard: `http://localhost:3000` (React dev server)

**Production Deployment:**
If deploying both together, update URLs:

```html
<!-- index.html - Change to relative path if same origin -->
<a href="/dashboard">🧠 Open ML Dashboard</a>

<!-- App.js - Change to relative path -->
<a href="/">← Back to Story</a>
```

### File Structure
```
Freight-Traffic-Emissions-CBX/
├── index.html                  # Root scrollytelling page ✓ Modified
├── script.js                   # Mapbox visualizations
├── style.css                   # Root page styles
├── data/                       # GeoJSON and images
└── frontend/                   # React app
    ├── public/
    │   └── index.html          # React entry (no changes)
    └── src/
        └── App.js              # Main React component ✓ Modified
```

---

## Testing

### 1. Test Root Page Button

```bash
# Serve root page (choose one method)
# Option A: Python
python -m http.server 8080

# Option B: Node (if you have http-server)
npx http-server -p 8080

# Option C: VS Code Live Server extension
# Right-click index.html → "Open with Live Server"
```

**Then:**
1. Open `http://localhost:8080/index.html`
2. Look for the blue-green gradient button
3. Click it - should open `http://localhost:3000` in new tab

### 2. Test ML Dashboard Button

```bash
# Make sure React is running
cd frontend
npm start
```

**Then:**
1. Open `http://localhost:3000`
2. Look for "← Back to Story" in top-right header
3. Click it - should navigate to root `index.html`

---

## For Production

When deploying to a static host (GitHub Pages, Netlify, Vercel):

### Option 1: Separate Deployments
- Deploy root page to main domain: `yourproject.com`
- Deploy React app to subdomain: `dashboard.yourproject.com`

### Option 2: Integrated Build
Build React and serve from root:

```bash
# Build React app
cd frontend
npm run build

# Move build to root
cp -r build/* ../

# Update paths
# index.html button: href="/dashboard"
# App.js button: href="/"
```

Then the structure becomes:
```
yourproject.com/
├── index.html           # Root story page
├── dashboard/           # React build output
│   ├── index.html
│   └── static/
└── data/
```

---

## Styling Notes

### Button Design Philosophy

**Root Page Button:**
- **Bold & Inviting**: Large gradient button to draw attention
- **Action-oriented**: "Open" verb + arrow suggest forward motion
- **Technical branding**: Brain emoji (🧠) + "ML" + "LSTM" establish technical credibility

**Dashboard Button:**
- **Subtle & Integrated**: Glassmorphism blends with header
- **Navigation aid**: Arrow (←) and "Back" indicate return function
- **Non-intrusive**: Doesn't compete with main content

---

## Summary

✅ **Root page** has prominent ML Dashboard button in hero section
✅ **ML Dashboard** has subtle back button in header
✅ Both links use appropriate styling for their context
✅ Navigation creates complete user flow for presentation

**No breaking changes** - only additions to existing code.
