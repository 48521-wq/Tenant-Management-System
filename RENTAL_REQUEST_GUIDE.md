# 🏠 TMS - Rental Request System  
## Complete Guide

---

## ✅ **What Was Built:**

### **1. DATABASE MODEL** ✨
- **File:** `backend/models/RentalRequest.js`
- **Features:**
  - Stores Tenant and Landlord information
  - Stores Property details
  - Request status (pending, accepted, rejected, cancelled)
  - Tenant's optional message/reason
  - Timestamps (requestedAt, respondedAt)

---

## **2. BACKEND API ROUTES** ⚙️
- **File:** `backend/routes/rentalRequests.js`

### **Endpoints:**

#### **TENANT Routes:**
```
GET  /api/rental-requests/my-requests
- View all your requests (with status and details)

POST /api/rental-requests/request
- Send request for an available property
- Body: { propertyId, message }

PUT  /api/rental-requests/:id/cancel
- Cancel your pending request
```

#### **LANDLORD Routes:**
```
GET  /api/rental-requests/received
- View all your received requests

PUT  /api/rental-requests/:id/accept
- Accept a request (property is automatically assigned)
- Other pending requests are automatically rejected

PUT  /api/rental-requests/:id/reject
- Reject a request
```

#### **ADMIN Route:**
```
GET  /api/rental-requests/
- View all requests (admin access)
```

---

## **3. TENANT DASHBOARD** 👨‍💼
- **File:** `pages/tenant-dashboard.html`

### **New Features:**

#### **"Request" Button on Property Cards:**
```html
🤝 Request Button
- Two action buttons on each property card:
  • "View 3D Model" 
  • "Request" (New!)
```

#### **New "Rental Requests" Page:**
```
📍 Location: Sidebar > Support > Rental Requests

Information Displayed:
✓ Request status (⏳ Pending, ✅ Accepted, ❌ Rejected, 🚫 Cancelled)
✓ Property details (name, location, rent)
✓ Landlord's name
✓ Request sent date
✓ Landlord's response (if received)
✓ Tenant's message (if provided)

Actions:
- Cancel pending requests
```

#### **New Request Modal:**
```
What is Displayed:
• Property title
• Monthly rent amount
• Location/Address
• Property type, beds, baths
• Optional message box (180 characters)

Actions:
• "Send Request" - send the request
• "Cancel" - close the dialog
```

---

## **4. LANDLORD DASHBOARD** 👨‍🏫
- **File:** `pages/landlord-dashboard.html`

### **New Features:**

#### **New "Rental Requests" Page:**
```
📍 Location: Sidebar > Tenant Issues > Rental Requests

Requests displayed by status:
✓ Pending (⏳) - Awaiting response
✓ Accepted (✅) - Approved
✓ Rejected (❌) - Declined
✓ Cancelled (🚫) - Cancelled

Each Request shows:
• Property details
• Tenant's name and email
• Request sent date
• Tenant's message (if provided)

Actions for Pending Requests:
• "✅ Accept" - Approve the request (property is assigned)
• "❌ Reject" - Decline the request
```

#### **Badge Updates:**
```
Red badge on Rental Requests nav item:
- Shows count of pending requests
- Updates automatically
```

---

## 🚀 **How to Use:**

### **STEP 1: Start the Server**
```bash
cd backend
npm install          # (first time only)
npm start            # or double-click START_SERVER.bat
```
✓ Running on http://localhost:5000

### **STEP 2: Open Frontend**
```
Open index.html (or http://localhost:3000)
```

---

## **📋 WORKFLOW - How It Works:**

### **STEP 1️⃣: Tenant Browses Properties**
```
Tenant Dashboard → "Find Properties"
→ Views available properties
```

### **STEP 2️⃣: Tenant Sends Request**
```
Clicks 🤝 "Request" button on property card
→ Modal opens
→ Can write optional message
→ Clicks "Send Request"
→ ✅ Request reaches Landlord
```

### **STEP 3️⃣: Landlord Views Request**
```
Landlord Dashboard → "Rental Requests" 
→ Views pending requests
→ Sees Tenant's information and message
```

### **STEP 4️⃣: Landlord Accepts or Rejects**

**If ACCEPT:**
```
Clicks "✅ Accept" button
→ Property tenantId is assigned
→ Property status changes "available" → "rented"
→ Other pending requests are automatically rejected
→ ✅ Request status becomes "accepted"
→ Tenant sees property marked: "✅ Accepted"
```

**If REJECT:**
```
Clicks "❌ Reject" button
→ Request status becomes "rejected"
→ Tenant is notified
→ Property remains available for other tenants
```

### **STEP 5️⃣: Tenant Views Their Request**
```
Tenant Dashboard → "Rental Requests"
→ Views status of all requests:
  • ⏳ Pending → Still awaiting response
  • ✅ Accepted → Property assigned! 🎉
  • ❌ Rejected → Try another property
  • 🚫 Cancelled → Cancelled request
```

---

## **🧪 TEST SCENARIOS:**

### **Test 1: Simple Request**
```
1. Register as a Tenant
2. Go to "Find Properties"
3. Select a property
4. Click 🤝 "Request"
5. Click "Send Request"
6. Tenant Dashboard → Rental Requests - should show ⏳ Pending
```

### **Test 2: Accept Request**
```
1. Login as Landlord in another browser
2. Go to "Rental Requests"
3. Click ✅ "Accept"
4. Tenant should see "✅ Accepted"
5. Property should be in "rented" status
```

### **Test 3: Reject Request**
```
1. Create a new Tenant account
2. Send a request (for another property)
3. Landlord clicks "❌ Reject"
4. Tenant should see "❌ Rejected"
5. Property should remain available
```

### **Test 4: Include Message**
```
1. Write a message in the request modal
2. Landlord should see this message in the request
3. Message should persist even after Accept/Reject
```

### **Test 5: Multiple Requests**
```
1. Get 3 requests from tenants for same property
2. Landlord accepts one ✅
3. Other 2 should auto-reject ❌
4. Only 1 remains "✅ Accepted"
```

---

## **📊 Database Changes:**

### **New Model:**
```
✓ Created RentalRequest collection
  - tenantId, tenantName, tenantEmail, tenantPhone
  - propertyId, propertyTitle, propertyAddress, propertyRent
  - landlordId, landlordName, landlordEmail
  - status (pending / accepted / rejected / cancelled)
  - message (optional)
  - requestedAt, respondedAt, timestamps
```

### **Existing Models Updated:**
```
✓ Property model:
  - tenantId (null initially, assigned when request is accepted)
  - tenantName (stored for reference)
  - status field "available" → "rented" (after acceptance)
```

---

## **🔄 Complete Request Flow:**

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. TENANT SIDE                                                  │
├─────────────────────────────────────────────────────────────────┤
│ Find Properties → Click "🤝 Request" → Send Message → Submit   │
│                                                                   │
│ ✓ RentalRequest is created                                      │
│ ✓ Status: "pending"                                             │
│ ✓ Landlord receives notification                                │
└─────────────────────────────────────────────────────────────────┘
                            ⬇️
┌─────────────────────────────────────────────────────────────────┐
│ 2. LANDLORD SIDE                                                │
├─────────────────────────────────────────────────────────────────┤
│ Dashboard → "Rental Requests" → See Pending Requests           │
│ Review Property Details ← View Tenant Info                      │
│                                                                   │
│ Decision: Accept ✅ OR Reject ❌                                │
└─────────────────────────────────────────────────────────────────┘
                    ⬇️(Accept)        ⬇️(Reject)
        ┌──────────────────┐   ┌──────────────────┐
        │ ACCEPT PATH      │   │ REJECT PATH      │
        ├──────────────────┤   ├──────────────────┤
        │ ✓ Request status │   │ ✓ Request status │
        │   → "accepted"   │   │   → "rejected"   │
        │ ✓ Property.tenant│   │ ✓ Property stays │
        │   assigned       │   │   "available"    │
        │ ✓ Property.status│   │ ✓ Tenant notified│
        │   → "rented"     │   └──────────────────┘
        │ ✓ Other requests │
        │   → "rejected"   │
        │ ✓ Tenant notified│
        └──────────────────┘
                            ⬇️
┌─────────────────────────────────────────────────────────────────┐
│ 3. TENANT SEES RESULT                                           │
├─────────────────────────────────────────────────────────────────┤
│ Dashboard → "Rental Requests" → See ✅ Accepted or ❌ Rejected │
│                                                                   │
│ If Accepted: Property is now RENTED to Tenant! 🎉               │
│ If Rejected: Try a different property                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## **📝 Notes:**

1. ✅ **Real-time:** All information is stored in MongoDB
2. ✅ **Validation:** Duplicate pending requests cannot be created
3. ✅ **Automatic:** Other requests auto-reject when one is accepted
4. ✅ **Secure:** Protected with JWT authentication
5. ✅ **User Friendly:** Simple UI with clear status badges
6. ✅ **Messages:** Tenants can include their message
7. ✅ **History:** Request history is preserved

---

## **🎯 Complete Features:**

### **For Tenants:**
- ✅ Browse properties
- ✅ Click "Request to Rent" on a property  
- ✅ Include optional message
- ✅ Track status of your requests
- ✅ Cancel pending requests
- ✅ View accepted requests

### **For Landlords:**
- ✅ View pending requests
- ✅ See Tenant's information
- ✅ Accept or Reject requests
- ✅ View request history
- ✅ Property is automatically assigned
- ✅ Select one from multiple requests

---

## **❓ Questions?**

If something goes wrong:
1. Check browser console (F12)
2. Test API calls in Network tab
3. Check MongoDB Atlas for RentalRequest collection
4. Review backend logs (npm start output)

---

**🎉 Your TMS is now ready with a complete Rental Request System!**
