# Test data hata kar realistic data daalna

Script: `backend/seed-real-data.js`

## Kya hota hai
**Rehta hai (kuch delete nahi hota):** saari Properties (sirf tenant-link dobara set hota hai), property-owner landlord accounts, 3D requests, aur jo accounts aap `--keep-email` mein dein.

**Delete hota hai:** baaqi users, rental requests (documents samet), payments (slips samet), maintenance, complaints, notifications, lease agreements.

**Naya data aata hai (sab kuch fictional):**
- 12 tenant accounts (password: `Tms@2026`, email `first.last@example.com`, e.g. `hamza.tariq@example.com`)
- Rental requests har status mein (pending, negotiating, docs_pending, docs_submitted, docs_rejected, rejected, cancelled, accepted)
- Har request ke saath ID card / police certificate / birth certificate (sample images)
- Rented properties ke liye 4 mahine ki rent payments, payment slips ke saath (paid, pending, rejected, overdue sab)
- Maintenance, complaints aur notifications

## Chalane ka tareeqa (backend folder mein)
```
cd backend
npm install
node seed-real-data.js --selftest      # offline check (database ki zaroorat nahi)
node seed-real-data.js                 # DRY RUN: sirf dikhata hai kya delete/insert hoga
node seed-real-data.js --confirm       # asal mein apply karta hai (pehle backup banata hai)
```
Agar kuch asli accounts rakhne hon (jaise apna ya classmates ka):
```
node seed-real-data.js --confirm --keep-email=a@gmail.com,b@gmail.com
```
Backup `backend/backups/<time>/` mein JSON files ki shakal mein milta hai.

## Zaroor parhein
- Slips aur documents **generated samples** hain (har image par "SAMPLE" likha hai). Asli CNIC / police certificate / bank slips nahi banaye ja sakte, woh asli users app se upload karenge.
- Script `.env` ki `MONGODB_URI` use karti hai. Pehle dry run karein aur "Accounts to delete" ki list dekh lein.
- `.env` mein live database aur email ka password hai: is zip ko public jagah share na karein.
