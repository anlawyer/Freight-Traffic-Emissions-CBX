# 🔧 Quick Fix Guide - Last Minute Issues

## 🚨 Emergency Checklist (2 minutes before demo)

```bash
# 1. Check backend is running
curl http://localhost:8000/

# 2. Check frontend is running
curl http://localhost:3000/

# 3. Check ML model is loaded
curl http://localhost:8000/model/info

# 4. Test prediction endpoint
curl -X POST http://localhost:8000/traffic/predict \
  -H "Content-Type: application/json" \
  -d '{"speed_limit_scenario": "current_50mph", "prediction_hours": 24}'
```

---

## Common Issues & 30-Second Fixes

### ❌ Backend won't start

**Error:** `ModuleNotFoundError: No module named 'tensorflow'`

**Fix:**
```bash
cd backend
pip install tensorflow==2.15.0 scikit-learn==1.3.2
python main.py
```

---

### ❌ Frontend won't start

**Error:** `Module not found: recharts`

**Fix:**
```bash
cd frontend
npm install recharts framer-motion
npm start
```

---

### ❌ Predictions not loading

**Symptom:** Clicking "Run Predictions" does nothing

**Possible Causes:**
1. Backend not running → Start with `python main.py`
2. CORS error → Check browser console, restart backend
3. Model not trained → Wait 2-3 minutes for initial training
4. Port conflict → Backend must be on port 8000

**Quick Test:**
```bash
# Open browser console (F12)
# Should see successful API calls
# If CORS error, restart backend
```

---

### ❌ Charts not rendering

**Symptom:** Empty boxes where charts should be

**Fix:**
```bash
# Ensure these are installed
cd frontend
npm install recharts framer-motion --force
npm start
```

**Alternative:**
- Check browser console for errors
- Try clicking "Run Both Predictions" again
- Refresh the page (Ctrl+R)

---

### ❌ "Model not initialized" error

**Symptom:** API returns 503 error

**Cause:** LSTM model is still training on startup

**Fix:**
- **Wait 2-3 minutes** for model to train
- Check backend logs for "LSTM model ready"
- If stuck, restart backend with:
  ```bash
  cd backend
  python main.py
  ```

---

### ❌ Slow predictions (>10 seconds)

**Cause:** TensorFlow running on CPU

**Fix (if time permits):**
```bash
# Install GPU-accelerated TensorFlow (NVIDIA GPUs only)
pip uninstall tensorflow
pip install tensorflow-gpu==2.15.0
```

**Workaround:**
- Reduce `prediction_hours` to 12 instead of 24
- Use simpler models (fallback is automatic)

---

### ❌ Socrata API errors

**Symptom:** "Error fetching traffic data"

**Good News:** App automatically falls back to synthetic data

**Optional Fix:**
```bash
# Add Socrata token to .env (not required)
cd backend
echo "SOCRATA_APP_TOKEN=your_token_here" >> .env
```

---

## 🎯 Pre-Demo Verification (5 minutes)

### Step 1: Start Backend
```bash
cd backend
python main.py
```

**Expected output:**
```
===========================================
URBAN FUTURES LEAP - STARTING UP
===========================================
INFO:     Initializing LSTM model...
INFO:     LSTM model ready
INFO:     Application ready!
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Step 2: Start Frontend
```bash
cd frontend
npm start
```

**Expected:** Browser opens to `http://localhost:3000`

### Step 3: Test ML Prediction
1. Click "ML Prediction" tab
2. Click "Run Both Predictions"
3. **Wait 3-5 seconds**
4. Should see two charts appear

### Step 4: Verify All Tabs
- ✅ Overview: Shows map and metric cards
- ✅ ML Prediction: Shows charts
- ✅ Comparison: Shows bar chart
- ✅ Model Info: Shows LSTM architecture

---

## 🔥 Nuclear Option (If everything is broken)

### Complete Reset (3 minutes)

```bash
# Kill all processes
pkill -f "python main.py"  # Mac/Linux
pkill -f "npm start"       # Mac/Linux

# Backend fresh install
cd backend
rm -rf __pycache__ models/
pip install -r requirements.txt
python main.py &

# Frontend fresh install
cd ../frontend
rm -rf node_modules package-lock.json
npm install
npm start
```

---

## 📱 Browser Compatibility

**Recommended:** Chrome, Edge, or Firefox (latest versions)

**If charts look broken:**
1. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Clear cache
3. Try incognito mode

---

## 🎬 Demo Mode (No Internet)

If you lose internet during demo:

1. **Backend:** Already using synthetic data (no Socrata API needed)
2. **Frontend:** Already loaded in browser
3. **Predictions:** Work offline once model is trained

**Pre-Demo Prep:**
```bash
# Train model before demo starts
cd backend
python main.py
# Wait for "LSTM model ready" message
# Keep running in background
```

---

## 🆘 Last Resort: Screenshots

If demo completely fails, have screenshots ready of:

1. **ML Prediction Tab** with both charts
2. **Comparison Tab** with bar chart
3. **Model Architecture** diagram
4. Terminal output showing model training

**Screenshot Locations:** (Create these during practice)
- `screenshots/prediction.png`
- `screenshots/comparison.png`
- `screenshots/model-info.png`
- `screenshots/training-logs.png`

---

## 💬 What to Say If Things Break

### If backend crashes mid-demo:
> "As you can see from our architecture diagram, the model has already been trained. In a production environment, we'd have redundancy and auto-restart. Let me show you the prediction results we generated earlier."

### If predictions are slow:
> "The LSTM is processing 24 hours of traffic data in real-time. In production, we'd cache predictions and use GPU acceleration. This demonstrates the computational complexity of true neural network inference."

### If charts don't load:
> "We're experiencing a rendering issue with the interactive charts, but I can walk you through the prediction results in the browser console, which shows the raw model output."

### If internet goes out:
> "Great timing to demonstrate our offline capability! The model is already trained and runs entirely locally. We only need internet for live Socrata API updates."

---

## 🎯 Confidence Boosters

Before going on stage:

1. ✅ **Practice the happy path** 3 times
2. ✅ **Know where logs are** (backend terminal, browser console)
3. ✅ **Have backup talking points** (model architecture, data sources)
4. ✅ **Test on demo machine** (not just your laptop)
5. ✅ **Take a deep breath** - you built something awesome!

---

## 📞 Debug Commands (Copy-Paste Ready)

```bash
# Check if ports are in use
lsof -ti:8000  # Backend port
lsof -ti:3000  # Frontend port

# View backend logs
cd backend && python main.py

# View frontend logs
cd frontend && npm start

# Test prediction API
curl -X POST http://localhost:8000/traffic/predict \
  -H "Content-Type: application/json" \
  -d '{"speed_limit_scenario": "current_50mph", "prediction_hours": 24}' \
  | python -m json.tool

# Check model status
curl http://localhost:8000/model/info | python -m json.tool

# Health check
curl http://localhost:8000/
```

---

## 🏆 You've Got This!

Remember:
- **Judges care more about the idea than perfect execution**
- **Explaining your approach is more valuable than flawless code**
- **Showing how you'd fix issues demonstrates real-world skills**
- **Passion and storytelling win hackathons**

**Break a leg! 🚀🌟**
