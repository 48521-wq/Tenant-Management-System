# Vercel Deploy (TMS)

1. Is folder ko GitHub repo me push karo (.env push NAHI hogi, .gitignore me hai).
2. vercel.com -> Add New -> Project -> repo import karo. Framework: "Other". Build settings ko default chhod do.
3. Settings -> Environment Variables me ye add karo:
   MONGODB_URI, JWT_SECRET, JWT_EXPIRES_IN, ADMIN_EMAIL, ADMIN_PASSWORD,
   GOOGLE_CLIENT_ID, EMAIL_USER, EMAIL_PASS, NODE_ENV=production
   (FRONTEND_URL = tumhara Vercel URL)
4. MongoDB Atlas -> Network Access -> Allow 0.0.0.0/0 (Vercel ke IPs fixed nahi hote).
5. Google Cloud Console -> OAuth client -> Authorized JavaScript origins me
   https://<your-project>.vercel.app add karo.
6. Deploy. Test: https://<your-project>.vercel.app/api/health
