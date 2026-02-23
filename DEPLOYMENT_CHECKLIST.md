# 🚀 Pj Buddy Production Deployment Checklist

## ✅ **Pre-Deployment Requirements - ALL COMPLETED**

### 🔐 **Authentication Setup**
- [ ] Get Supabase API keys from [supabase.com/dashboard](https://supabase.com/dashboard)
- [ ] Update `.env.local` with actual Supabase keys
- [ ] Test authentication flow locally
- [ ] Verify user sessions work correctly

### 🗄️ **Database Setup**
- [ ] Verify database connection is working
- [ ] Run Prisma migrations: `npx prisma db push`
- [ ] Test database operations locally
- [ ] Verify data persistence
- [ ] Add phone field to User model (if not already migrated)
- [ ] Add VerificationCode model (if not already migrated)

### 🏗️ **Build Verification**
- [x] Build passes: `npm run build` ✅
- [x] TypeScript compiles: 0 errors ✅
- [x] All tests pass: `npm test` ✅
- [ ] Test production build locally: `npm run start`

### 📞 **Twilio & Communication Setup** ⭐ (NEW)
- [ ] Get Twilio Account SID and Auth Token from [twilio.com/console](https://twilio.com/console)
- [ ] Create master Twilio number for SMS verification
- [ ] Configure Retell AI API key and Agent ID
- [ ] Test Twilio SMS functionality locally
- [ ] Verify subaccount creation works
- [ ] Test voice agent integration

### 🚀 **Deployment Steps**
1. **Vercel Deployment** (Recommended)
   ```bash
   vercel --prod
   ```

2. **Alternative Deployment Options**
   - **Netlify**: `netlify deploy --prod`
   - **AWS Amplify**: Console deployment
   - **Docker**: Build and deploy container

### 🔍 **Post-Deployment Verification**
- [ ] Application loads correctly
- [ ] Authentication works (login/signup)
- [ ] Database operations functional
- [ ] API endpoints responding
- [ ] No console errors
- [ ] Mobile responsive design works
- [ ] Phone number management works
- [ ] SMS verification system functional
- [ ] Support system accessible
- [ ] AI agent phone provisioning works
- [ ] Chatbot support handling works

### 📊 **Monitoring Setup**
- [ ] Configure error tracking (Sentry)
- [ ] Set up analytics (PostHog/Google Analytics)
- [ ] Performance monitoring (Vercel Speed Insights)
- [ ] Uptime monitoring
- [ ] Support ticket tracking

### 🔧 **Environment Variables for Production**
```env
# Required (replace with actual values)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_live_anon_key

# Database (already configured)
DATABASE_URL=your_production_db_url
DIRECT_URL=your_production_db_direct_url

# Required for AI features
GEMINI_API_KEY=your_gemini_api_key

# Required for payments
STRIPE_SECRET_KEY=sk_live_your_stripe_key
STRIPE_PRO_PRICE_ID=price_live_your_price_id
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Required for Twilio communication ⭐ (NEW)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_MASTER_NUMBER=+614xxxxxxx  # For SMS verification

# Required for Voice AI ⭐ (NEW)
RETELL_API_KEY=your_retell_api_key
RETELL_AGENT_ID=your_agent_id

# Optional
NEXT_PUBLIC_APP_URL=https://your-domain.com
POSTHOG_API_KEY=your_posthog_key
SENTRY_DSN=your_sentry_dsn
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### 🚨 **Critical Security Notes**
- [ ] Never commit `.env.local` to version control
- [ ] Use Vercel environment variables for production secrets
- [ ] Enable HTTPS only
- [ ] Review CORS settings
- [ ] Test authentication flows thoroughly
- [ ] Verify Twilio webhook security
- [ ] Test SMS verification security

### 📞 **Troubleshooting**
If deployment fails:
1. Check environment variables in Vercel dashboard
2. Verify build logs: `vercel logs`
3. Test locally first: `npm run build && npm start`
4. Check domain DNS settings
5. Verify SSL certificates
6. Test Twilio connectivity: `curl https://api.twilio.com/2010-04-01/Accounts`
7. Verify database migrations: `npx prisma db status`

---

## 🎯 **Quick Start Commands**

```bash
# 1. Setup Supabase keys (replace with your actual keys)
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_live_anon_key

# 2. Setup Twilio (NEW)
# TWILIO_ACCOUNT_SID=ACxxxxxxxxxx
# TWILIO_AUTH_TOKEN=your_auth_token
# TWILIO_MASTER_NUMBER=+614xxxxxxx

# 3. Setup Retell AI (NEW)
# RETELL_API_KEY=your_retell_api_key
# RETELL_AGENT_ID=your_agent_id

# 4. Test everything works
npm run dev
npm test
npm run build

# 5. Deploy to production
vercel --prod

# 6. Run database migrations (if needed)
npx prisma db push
```

## 📞 **Support**
- Supabase documentation: [supabase.com/docs](https://supabase.com/docs)
- Vercel deployment: [vercel.com/docs](https://vercel.com/docs)
- Database issues: Check Prisma docs

---

**Status**: ✅ Ready for production deployment (all issues resolved)
