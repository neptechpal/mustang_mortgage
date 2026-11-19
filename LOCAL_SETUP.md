# 🚀 Local Development Setup Guide

## For Running on Your Machine Locally

Since npm isn't available in the cloud environment, here's how to run the application on your local Windows machine.

---

## 📋 Prerequisites

Before starting, ensure you have installed:

1. **Node.js v18 or higher**
   - Download from: https://nodejs.org/
   - Recommended: LTS version (v22)
   - npm comes included automatically

2. **PostgreSQL** (for database)
   - Download from: https://www.postgresql.org/download/windows/
   - Or use cloud database like AWS RDS, Neon, or Supabase

3. **Git** (already have it)
   - For cloning and pulling code

---

## 🔧 Step-by-Step Setup

### **Step 1: Clone the Repository**

Open Command Prompt or PowerShell and run:

```bash
cd C:\Users\YourUsername\Projects  # or your preferred location

git clone https://github.com/neptechpal/mustang_mortgage.git

cd mustang_mortgage
```

### **Step 2: Install Dependencies**

```bash
npm install
```

This will install all packages including:
- Next.js 15
- React 19
- Prisma 6
- TypeScript
- And all other dependencies

**Time:** ~2-5 minutes depending on internet speed

### **Step 3: Configure Environment**

Create `.env.local` file in the project root:

```bash
copy .env.example .env.local
```

Then edit `.env.local` with your favorite editor and configure:

```env
# Database Connection
DATABASE_URL=postgresql://user:password@localhost:5432/mustang_mortgage

# Session & Security
SESSION_SECRET=your-random-secret-string-at-least-32-characters-long

# URLs
SITE_URL=http://localhost:3005
NEXT_PUBLIC_APP_URL=http://localhost:3005

# Storage
STORAGE_DIR=./storage/private

# Email (for enquiry notifications)
MAIL_FROM=info@mustangmortgage.com.au
MAIL_FROM_NAME="Mustang Mortgage"
ADMIN_NOTIFY_EMAIL=info@mustangmortgage.com.au
SMTP2GO_API_KEY=your-smtp2go-api-key

# Cron Jobs
CRON_SECRET=your-cron-secret
```

### **Step 4: Set Up Database**

```bash
# Create database migrations
npx prisma db push

# Generate Prisma client
npx prisma generate
```

This will:
- Connect to your PostgreSQL database
- Create all necessary tables
- Set up the new tables: Testimonial, TwoFactorAuth, OtpToken, SiteSettings

### **Step 5: Start Development Server**

```bash
# Start on port 3005
npm run dev -- -p 3005

# Or default port 3000
npm run dev
```

**Output should show:**
```
 ▲ Next.js 15.5.28
 - Local:        http://localhost:3005
 - Environments: .env.local
```

### **Step 6: Access the Application**

Open your browser and go to:

| Page | URL |
|------|-----|
| **Public Site** | http://localhost:3005 |
| **Admin Dashboard** | http://localhost:3005/admin |
| **Login** | http://localhost:3005/login |
| **Contact Form** | http://localhost:3005/contact |
| **Calculators** | http://localhost:3005/calculators |

---

## 🧪 Testing the New Features

### **1. Test Homepage**
- Go to http://localhost:3005
- Verify lenders section displays
- Check that no personal phone/email is shown
- Testimonials section should be visible (empty initially)

### **2. Test Contact Form**
- Go to http://localhost:3005/contact
- Fill out the form
- Submit
- Check your email (if SMTP configured) for notification

### **3. Test Registration Redirect**
- Go to http://localhost:3005/register
- Should redirect to http://localhost:3005/contact

### **4. Test Admin - Testimonials**
- Go to http://localhost:3005/admin/testimonials
- Click "Add Testimonial"
- Fill in:
  - Client Name: "John Doe"
  - Testimonial: "Great service!"
  - Role: "First Home Buyer"
  - Rating: 5 stars
  - Check "Approved" and "Published"
- Save
- Go back to homepage - testimonial should appear!

### **5. Test Admin - Email Settings**
- Go to http://localhost:3005/admin/email-settings
- Add your email address
- Save
- Submit contact form again
- Verify email notification arrives

---

## 📦 Database Setup Details

### **PostgreSQL Local Setup (Windows)**

**Option A: Using Local PostgreSQL**

1. Download and install PostgreSQL from https://www.postgresql.org/download/windows/
2. During installation:
   - Set password for `postgres` user (remember it!)
   - Default port: 5432
3. Update `.env.local`:
   ```env
   DATABASE_URL=postgresql://postgres:your_password@localhost:5432/mustang_mortgage
   ```
4. Create database:
   ```bash
   createdb -U postgres mustang_mortgage
   ```
5. Run migrations:
   ```bash
   npx prisma db push
   ```

**Option B: Using Cloud Database (Recommended for Development)**

1. Create account on https://neon.tech or https://railway.app or similar
2. Create new PostgreSQL database
3. Copy connection string to `.env.local`
4. Run migrations as above

---

## 🛠️ Useful Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Type checking
npm run lint

# TypeScript validation
npx tsc --noEmit

# View database in GUI (optional)
npx prisma studio

# Reset database (WARNING: deletes data)
npx prisma db push --force-reset

# Generate Prisma client
npx prisma generate
```

---

## 🐛 Troubleshooting

### **Port Already in Use**
```bash
# Use different port
npm run dev -- -p 3006
```

### **Database Connection Failed**
```
Error: Can't reach database server at `localhost`

Fix:
1. Verify PostgreSQL is running
2. Check DATABASE_URL in .env.local
3. Test connection: psql -U postgres -d mustang_mortgage
```

### **Dependencies Installation Issues**
```bash
# Clear cache and reinstall
rm -r node_modules package-lock.json
npm install
```

### **Prisma Generation Error**
```bash
npx prisma generate
npx prisma db push
```

### **TypeScript Errors**
```bash
# Check all errors
npx tsc --noEmit

# Fix if possible
npm run lint --fix
```

---

## 📁 Project Structure

```
mustang_mortgage/
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── modules/          # Feature modules
│   ├── lib/              # Shared utilities
│   └── components/       # Shared components
├── prisma/
│   └── schema/           # Database schemas
├── public/               # Static files
├── .env.example          # Environment template
├── .env.local            # Your local config (not in git)
├── package.json
└── next.config.ts
```

---

## 🔄 Workflow

Typical development workflow:

```bash
# 1. Pull latest code
git pull origin main

# 2. Install any new dependencies
npm install

# 3. Update database schema if needed
npx prisma db push

# 4. Start dev server
npm run dev

# 5. Make changes in src/
# 6. Browser auto-refreshes (Hot Reload)

# 7. When done, commit
git add .
git commit -m "Your message"
git push origin main

# This triggers auto-deployment!
```

---

## 📞 Development Tips

### **Hot Reload**
- Changes to files auto-refresh in browser
- No need to restart server
- Very fast feedback loop

### **Console Logs**
- Server logs appear in terminal where you ran `npm run dev`
- Browser console: F12 in browser

### **Database Inspection**
```bash
# Open GUI database browser
npx prisma studio

# Then go to http://localhost:5555
```

### **API Testing**
Use tools like:
- Postman
- Thunder Client (VS Code extension)
- curl

---

## ✅ Verification Checklist

After setup:

- [ ] Node.js installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] Repository cloned
- [ ] `.env.local` configured
- [ ] Database connected (`npx prisma db push` succeeds)
- [ ] Dev server starts (`npm run dev`)
- [ ] Browser loads http://localhost:3005
- [ ] Admin pages accessible
- [ ] New features visible

---

## 🚀 Next: Deployment

Once tested locally and working well:

1. Push to GitHub
2. Auto-deployment triggers
3. Check deployment dashboard
4. Verify on production URL

---

**Happy developing! 🎉**

For more details, check the other documentation files:
- `IMPLEMENTATION_SUMMARY.md` - Technical specs
- `PROJECT_COMPLETION_REPORT.md` - Full project overview
- `SETUP_GUIDE.md` - Additional setup help
- `GITHUB_READY.md` - Quick reference

