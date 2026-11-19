# 🚀 Mustang Mortgage - Complete Local Setup

## For Windows Users - Copy & Paste These Commands

### **Open Command Prompt and run these commands in order:**

```bash
REM Step 1: Clone repository
git clone https://github.com/neptechpal/mustang_mortgage.git
cd mustang_mortgage

REM Step 2: Install dependencies (takes 2-5 minutes)
npm install

REM Step 3: Start the development server
npm run dev -- -p 3005
```

That's it! You should see:
```
▲ Next.js 15.5.28
 - Local:        http://localhost:3005
```

### **Then open your browser:**
- Go to: **http://localhost:3005**

---

## ⚙️ Configuration Already Included

The `.env.local` file is already set up with:
- ✅ Database configuration (PostgreSQL)
- ✅ Session secrets
- ✅ Email settings
- ✅ Storage paths
- ✅ All URLs configured

No additional setup needed - just run the commands!

---

## 🧪 Test These Features (Once Running)

### Homepage (`http://localhost:3005`)
- ✅ See new **Lenders & Banks** section
- ✅ See new **Testimonials** section  
- ✅ Verify no personal contact info visible
- ✅ All calculators and tools working

### Contact Form (`http://localhost:3005/contact`)
- ✅ Form should work
- ✅ Submit and verify

### Admin (`http://localhost:3005/admin`)
- ✅ Testimonials at `/admin/testimonials`
- ✅ Email Settings at `/admin/email-settings`
- ✅ Add a test testimonial
- ✅ Configure email recipients

### Registration (`http://localhost:3005/register`)
- ✅ Should redirect to contact page

---

## 📊 What's New in This Version

✅ **Lenders Section** - 10 AFG-accredited banks  
✅ **Testimonials** - Add reviews from admin  
✅ **Email Settings** - Configure enquiry notifications  
✅ **OTP Access** - Secure client portal  
✅ **Personal Info Removed** - Generic broker site  
✅ **4 New Database Tables** - Testimonial, TwoFactorAuth, OtpToken, SiteSettings  

---

## ⏸️ To Stop the Server

Press `Ctrl + C` in the Command Prompt

---

## 🔧 If You Need to Restart

Just run again:
```bash
npm run dev -- -p 3005
```

---

## 📁 All Files Are Ready

The repository at **https://github.com/neptechpal/mustang_mortgage** contains:
- ✅ All source code with new features
- ✅ Database schema (Prisma)
- ✅ Configuration files
- ✅ Documentation

Everything is committed and ready to use!

---

**That's all you need to do! 🎉**

