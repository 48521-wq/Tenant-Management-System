# 🏠 TMS - Rental Request System  
## مکمل راہنمائی

---

## ✅ **وہ کیا بنایا گیا:**

### **1. DATABASE MODEL** ✨
- **File:** `backend/models/RentalRequest.js`
- **Features:**
  - Tenant اور Landlord کی معلومات محفوظ کرتا ہے
  - Property کی تفصیلات store کرتا ہے
  - Request کا status (pending, accepted, rejected, cancelled)
  - Tenant کا optional message/reason
  - یادیں (requestedAt, respondedAt)

---

## **2. BACKEND API ROUTES** ⚙️
- **File:** `backend/routes/rentalRequests.js`

### **Endpoints:**

#### **TENANT Routes:**
```
GET  /api/rental-requests/my-requests
- اپنی تمام requests دیکھیں (status اور تفصیلات کے ساتھ)

POST /api/rental-requests/request
- Available property کے لیے request بھیجیں
- Body: { propertyId, message }

PUT  /api/rental-requests/:id/cancel
- اپنی pending request منسوخ کریں
```

#### **LANDLORD Routes:**
```
GET  /api/rental-requests/received
- آپ کی تمام received requests دیکھیں

PUT  /api/rental-requests/:id/accept
- Request قبول کریں (property automatic assign ہوتی ہے)
- دوسری pending requests خود بخود reject ہو جاتی ہیں

PUT  /api/rental-requests/:id/reject
- Request مسترد کریں
```

#### **ADMIN Route:**
```
GET  /api/rental-requests/
- تمام requests دیکھیں (admin access)
```

---

## **3. TENANT DASHBOARD** 👨‍💼
- **File:** `pages/tenant-dashboard.html`

### **نئے Features:**

#### **Property Cards میں "Request" Button:**
```html
🤝 Request Button
- ہر property card پر دوپہلو buttons:
  • "View 3D Model" 
  • "Request" (نیا!)
```

#### **نیا "Rental Requests" Page:**
```
📍 Location: Sidebar > Support > Rental Requests

دکھائے جانے والی معلومات:
✓ Request کی status (⏳ Pending, ✅ Accepted, ❌ Rejected, 🚫 Cancelled)
✓ Property کی تفصیلات (نام، منتقل، کرایہ)
✓ Landlord کا نام
✓ Request بھیجنے کی تاریخ
✓ Landlord کا جواب (اگر موصول ہو)
✓ Tenant کا message (اگر دیا گیا ہو)

Actions:
- Pending requests کو منسوخ کریں
```

#### **نیا Request Modal:**
```
کیا دیکھائے جاتے ہیں:
• Property title
• Monthly rent amount
• Location/Address
• Property type, beds, baths
• Optional message box (180 characters)

Actions:
• "Send Request" - request بھیجیں
• "Cancel" - بند کریں
```

---

## **4. LANDLORD DASHBOARD** 👨‍🏫
- **File:** `pages/landlord-dashboard.html`

### **نئے Features:**

#### **نیا "Rental Requests" Page:**
```
📍 Location: Sidebar > Tenant Issues > Rental Requests

Requests کو Status کے حساب سے دکھایا جاتا ہے:
✓ Pending (⏳) - فی الوقت
✓ Accepted (✅) - قبول شدہ
✓ Rejected (❌) - مسترد
✓ Cancelled (🚫) - منسوخ

ہر Request میں:
• Property کی تفصیلات
• Tenant کا نام اور email
• Request کی تاریخ
• Tenant کا message (اگر موجود ہو)

Pending Requests کے لیے Actions:
• "✅ Accept" - قبول کریں (property assign ہوتی ہے)
• "❌ Reject" - مسترد کریں
```

#### **Badge Updates:**
```
Rental Requests nav item پر سرخ badge دکھاتا ہے:
- Pending requests کی تعداد
- خودکار اپڈیٹ ہوتا ہے
```

---

## 🚀 **کیسے استعمال کریں:**

### **STEP 1: Server شروع کریں**
```bash
cd backend
npm install          # (پہلی بار صرف)
npm start            # یا double-click START_SERVER.bat
```
✓ http://localhost:5000 پر چل رہا ہے

### **STEP 2: Frontend کھولیں**
```
index.html کھولیں (یا http://localhost:3000)
```

---

## **📋 WORKFLOW - کیسے کام کرتا ہے:**

### **STEP 1️⃣: Tenant Property Browse کرتا ہے**
```
Tenant Dashboard → "Find Properties"
→ Available properties دیکھتا ہے
```

### **STEP 2️⃣: Tenant Request بھیجتا ہے**
```
Property card پر 🤝 "Request" button دبایا
→ Modal کھلتا ہے
→ Optional Message لکھ سکتا ہے
→ "Send Request" دبایا
→ ✅ Request Landlord تک پہنچتا ہے
```

### **STEP 3️⃣: Landlord Request دیکھتا ہے**
```
Landlord Dashboard → "Rental Requests" 
→ Pending requests دیکھتے ہیں
→ Tenant کی معلومات اور message دیکھتے ہیں
```

### **STEP 4️⃣: Landlord Accept یا Reject کرتا ہے**

**اگر ACCEPT:**
```
"✅ Accept" button دبایا
→ Property -> tenantId assign ہوتی ہے
→ Property status "available" → "rented" ہوتی ہے
→ دوسری pending requests خود منسوخ ہو جاتی ہیں
→ ✅ Request "accepted" status میں آتی ہے
→ Tenant کو property دیکھتے ہیں: "✅ Accepted"
```

**اگر REJECT:**
```
"❌ Reject" button دبایا
→ Request "rejected" status میں آتی ہے
→ Tenant کو الرٹ ملتی ہے
→ Property دستیاب رہتی ہے دوسرے tenants کے لیے
```

### **STEP 5️⃣: Tenant اپنا Request دیکھتا ہے**
```
Tenant Dashboard → "Rental Requests"
→ تمام requests کی status دیکھتے ہیں:
  • ⏳ Pending → ہنوز موصول نہیں
  • ✅ Accepted → Property assign ہو گئی! 🎉
  • ❌ Rejected → دوبارہ request کا فیصلہ
  • 🚫 Cancelled → منسوخ
```

---

## **🧪 TEST SCENARIOS:**

### **Test 1: Simple Request**
```
1. Tenant Register کریں
2. "Find Properties" میں جائیں
3. کوئی property select کریں
4. 🤝 "Request" دبائیں
5. "Send Request" کریں
6. Tenant Dashboard → Rental Requests میں ⏳ Pending دیکھیں
```

### **Test 2: Accept Request**
```
1. دوسرے browser میں Landlord login کریں
2. "Rental Requests" میں جائیں
3. ✅ "Accept" دبائیں
4. Tenant کو "✅ Accepted" دیکھنی چاہیے
5. Property "rented" status میں ہونی چاہیے
```

### **Test 3: Reject Request**
```
1. نیا Tenant بنائیں
2. Request بھیجیں (دوسری property)
3. Landlord "❌ Reject" دبائے
4. Tenant کو "❌ Rejected" دیکھنی چاہیے
5. Property دستیاب رہے
```

### **Test 4: Message Include کریں**
```
1. Request modal میں message لکھیں
2. Landlord کو یہ message Request میں نظر آنی چاہیے
3. Accepted/Rejected ہونے کے بعد بھی message رہے
```

### **Test 5: Multiple Requests**
```
1. ایک property کے لیے 3 tenants سے requests
2. Landlord ایک ✅ Accept کرے
3. دوسری 2 خود محدود ❌ Rejected ہو جانی چاہیں
4. صرف 1 "✅ Accepted" رہے
```

---

## **📊 Database Changes:**

### **نیا Model:**
```
✓ RentalRequest collection بنایا
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
  - tenantId (null initially, request قبول ہونے پر assign)
  - tenantName (stored for reference)
  - status field "available" → "rented" (accept کے بعد)
```

---

## **🔄 Complete Request Flow:**

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. TENANT SIDE                                                  │
├─────────────────────────────────────────────────────────────────┤
│ Find Properties → Click "🤝 Request" → Send Message → Submit   │
│                                                                   │
│ ✓ RentalRequest create ہوتا ہے                                  │
│ ✓ Status: "pending"                                             │
│ ✓ Landlord کو notification ملتی ہے                              │
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
        │   ← tenantId     │   │   "available"    │
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
│ If Rejected: Try Different Property                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## **📝 نوٹس:**

1. ✅ **Real-time:** تمام معلومات MongoDB میں محفوظ ہیں
2. ✅ **Validation:** Duplicate pending requests نہیں بن سکتے
3. ✅ **Automatic:** Accept پر دوسری requests خود منسوخ ہوتی ہیں
4. ✅ **Secure:** JWT authentication سے محفوظ
5. ✅ **User Friendly:** سادہ UI اور clear status badges
6. ✅ **Messages:** Tenants اپنا پیغام شامل کر سکتے ہیں
7. ✅ **History:** Request history محفوظ رہتی ہے

---

## **🎯 مکمل فیچرز:**

### **Tenant کے لیے:**
- ✅ Properties کو browse کریں
- ✅ Property کے لیے "Request to Rent" دبائیں  
- ✅ Optional message شامل کریں
- ✅ اپنی requests کی status ٹریک کریں
- ✅ Pending requests منسوخ کر سکتے ہیں
- ✅ Accepted requests دیکھ سکتے ہیں

### **Landlord کے لیے:**
- ✅ Pending requests دیکھیں
- ✅ Tenant کی معلومات دیکھیں
- ✅ Accept یا Reject کریں
- ✅ Request history دیکھیں
- ✅ Property خودکار assign ہوتی ہے
- ✅ Multiple requests میں سے ایک select کریں

---

## **❓ سوالات؟**

اگر کچھ غلط ہو تو:
1. Browser console دیکھیں (F12)
2. Network tab میں API calls ٹیسٹ کریں
3. MongoDB Atlas میں RentalRequest collection چیک کریں
4. Backend logs دیکھیں (npm start output)

---

**🎉 آپ کا TMS اب مکمل Rental Request System کے ساتھ تیار ہے!**
