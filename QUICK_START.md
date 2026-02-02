# Shenv - Quick Start Guide

## What's New?

We've implemented a **queue system** and **action suggestions** to align with the product vision!

---

## ✅ What Works Now

### 1. User Tiers (Signup)
- Visit `/signup`
- Choose tier: **Free** / **Pro ($29/mo)** / **Business**
- Free users → queue-based scans
- Paid users → skip the queue

### 2. Queue System
**API Endpoints:**
```bash
# Queue a scan
POST /api/scans/queue
{
  "scope": "full",
  "platforms": ["google_workspace", "gmail"]
}

# Check status
GET /api/scans/queue/123/status

# View history
GET /api/scans/history
```

**Frontend:**
- Visit `/scans/queue?jobId=123` to see status
- Real-time updates every 10 seconds
- Shows position, wait time, upgrade options

### 3. Action Suggestions
**API Endpoints:**
```bash
# Get suggestions for an asset
GET /api/assets/456/suggestions

# Get batch suggestions
GET /api/assets/suggestions/batch
```

**Frontend:**
- Visit `/assets` (analytics view)
- See **batch actions panel** at top
- Suggestions: Make All Private, Transfer Orphaned, Review External

---

## 🚀 How to Test

### Step 1: Start Database
```bash
docker compose up -d
cd backend
npm run db:push
```

### Step 2: Start Backend
```bash
cd backend
npm run dev
```

### Step 3: Start Frontend
```bash
cd shenv
npm run dev
```

### Step 4: Test Features
1. **Signup** - Create account with different tiers
2. **Queue** - Use Postman to queue a scan
3. **Status** - Visit `/scans/queue?jobId=1`
4. **Suggestions** - Visit `/assets` to see batch actions

---

## 📊 Key Numbers

- **22 files** created/modified
- **8 new API endpoints** (queue + suggestions)
- **6 frontend components** built
- **4 database tables** added
- **55% progress** toward full refactoring

---

## ⚠️ What's Missing

### Critical
- ❌ **Background worker** - Jobs stay in queue forever
- ❌ **Payment integration** - Skip queue is placeholder
- ❌ **Action execution** - Buttons don't actually do anything yet

### Important
- ❌ Email notifications
- ❌ Progress dashboard
- ❌ Scheduled scans

---

## 🛠️ Next Steps

1. **Implement background worker** (Bull/Agenda.js)
2. **Test API endpoints** with real data
3. **Implement action execution** (Make Private, Delete, etc.)
4. **Add Stripe** for payments
5. **Add Sendgrid** for emails

---

## 📖 Full Documentation

- [IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md) - Complete implementation details
- [REFACTORING_PROGRESS.md](REFACTORING_PROGRESS.md) - Phase-by-phase progress
- [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) - Technical status report
- [PRODUCT_FEATURES.md](PRODUCT_FEATURES.md) - Product requirements

---

**Ready to continue? Let's build the worker next!**
