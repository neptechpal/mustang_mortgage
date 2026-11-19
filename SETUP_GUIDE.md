# Setup Guide: Running Mustang Mortgage Locally

## Current Status
✅ All code changes have been successfully implemented and are ready to test
❌ Development environment needs npm/Node.js setup

## Prerequisites

You need to install Node.js and npm on your system. The application requires:
- **Node.js**: v18+ (v24+ preferred)
- **npm**: v9+

### Installation Steps

#### Option 1: Install from nodejs.org (Recommended)
1. Go to https://nodejs.org/
2. Download the LTS version (currently v20 or v22)
3. Run the installer and follow the prompts
4. This will install both Node.js and npm

#### Option 2: Using Chocolatey (Windows)
```powershell
choco install nodejs
```

#### Option 3: Using Windows Package Manager
```powershell
winget install OpenJS.NodeJS
```

## Running the Application

After installing Node.js and npm:

### 1. Install Dependencies
```bash
cd "C:\Sulav Personal\Web Projects\Mustang Mortgage\mustang_mortgage-main"
npm install
```

### 2. Set Up Database
```bash
# Apply database migrations
npx prisma db push

# Generate Prisma client
npx prisma generate
```

### 3. Configure Environment Variables
Create or verify `.env.local` file with:
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/mustang_mortgage

# App settings
NEXT_PUBLIC_APP_URL=http://localhost:3005

# Email (SMTP2GO or your email provider)
SMTP_HOST=smtp.smtp2go.com
SMTP_PORT=587
SMTP_USER=your-api-key
SMTP_PASS=your-api-key
SMTP_FROM=info@mustangmortgage.com.au
```

### 4. Start the Development Server
```bash
# Start on default port 3000
npm run dev

# Or specify port 3005
npm run dev -- -p 3005
```

### 5. Access the Application
Open your browser and navigate to:
- **Public Site**: http://localhost:3005
- **Admin Panel**: http://localhost:3005/admin
- **Client Portal**: http://localhost:3005/portal
- **Secure OTP**: http://localhost:3005/portal/verify-otp

## Testing the New Features

### 1. Test Homepage Changes
- [ ] Go to http://localhost:3005
- [ ] Verify no personal phone number is displayed
- [ ] Check that lenders section shows with proper categories
- [ ] Look for testimonials section (empty initially)
- [ ] Verify "Calculators" and other tools still work

### 2. Test Registration Redirect
- [ ] Go to http://localhost:3005/register
- [ ] Should redirect to contact page
- [ ] Verify URL changed to /contact

### 3. Test Contact Form
- [ ] Fill out enquiry form with your email
- [ ] Submit the form
- [ ] Check that you receive an email with the form data
- [ ] Verify email goes to configured recipients

### 4. Test Admin Testimonials
- [ ] Log in to admin at http://localhost:3005/admin
- [ ] Navigate to Testimonials
- [ ] Add a new testimonial:
  - Client Name: "John Smith"
  - Content: "Great service and very professional broker!"
  - Rating: 5 stars
  - Role: "First Home Buyer"
  - Check "Approved" and "Published"
- [ ] Save
- [ ] Go back to homepage
- [ ] Should see testimonial in testimonials section

### 5. Test Email Settings
- [ ] In admin, go to Email Settings
- [ ] Add multiple email addresses for enquiry notifications
- [ ] Save settings
- [ ] Submit another contact form
- [ ] All configured emails should receive the enquiry

### 6. Test OTP Flow (Future - when 2FA is complete)
- [ ] Submit contact form
- [ ] Admin generates OTP for the client
- [ ] Client receives email with OTP link
- [ ] Client clicks link to /portal/verify-otp?token=...
- [ ] Client enters 6-digit OTP
- [ ] Client gains access to portal

## Verifying Code Changes

### TypeScript Validation
```bash
npx tsc --noEmit
```

### Build Test
```bash
npm run build
```

### Code Linting
```bash
npm run lint
```

## Common Issues & Troubleshooting

### Issue: `Error: Cannot find module 'next'`
**Solution**: Run `npm install` again, or delete `node_modules` and `.next` folders and reinstall

### Issue: `Error: PostgreSQL connection refused`
**Solution**: 
- Ensure PostgreSQL is running
- Check DATABASE_URL in .env.local
- Verify database exists and credentials are correct

### Issue: `Error: SMTP connection failed`
**Solution**:
- Verify SMTP credentials in .env.local
- Check that SMTP_FROM email is configured
- Test with a simple email provider first (like Mailtrap for testing)

### Issue: Port 3005 already in use
**Solution**: 
```bash
# Use a different port
npm run dev -- -p 3006
```

### Issue: `Prisma error: The P_BINARY_PATH variable`
**Solution**: 
```bash
npx prisma generate
npx prisma db push
```

## Project Structure Quick Reference

```
├── src/
│   ├── app/
│   │   ├── (site)/          - Public website pages
│   │   ├── admin/           - Admin dashboard
│   │   ├── portal/          - Client portal
│   │   └── api/             - API endpoints
│   ├── modules/
│   │   ├── web/             - Website components and config
│   │   ├── members/         - User auth and profiles
│   │   └── site/            - Form submissions, OTP
│   └── lib/
│       ├── db.ts            - Database client
│       ├── mail.ts          - Email sending
│       └── session.ts       - Authentication
├── prisma/
│   └── schema/              - Database schemas
├── package.json             - Dependencies
└── .env.example             - Environment template
```

## Next Development Steps

### Short Term
1. Test all features locally
2. Configure actual lenders list
3. Set up email recipients
4. Add sample testimonials

### Medium Term
1. Implement 2FA setup and enforcement
2. Test OTP client access flow
3. User acceptance testing
4. Performance testing

### Long Term
1. Deploy to staging environment
2. Full security audit
3. Load testing
4. Production deployment

## Support

If you encounter any issues:

1. Check the IMPLEMENTATION_SUMMARY.md for detailed changes
2. Review ARCHITECTURE.md for framework patterns
3. Check application logs: `npm run dev` shows console output
4. Database logs: Check PostgreSQL logs if schema changes fail
5. Email logs: Check SMTP2GO dashboard for delivery status

## Quick Command Reference

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Run linter
npm run lint

# Type check
npx tsc --noEmit

# Reset database (careful!)
npx prisma db push --force-reset

# View database GUI
npx prisma studio

# Generate Prisma client
npx prisma generate
```

## Environment Checklist

Before running locally, ensure you have:

- [ ] Node.js v18+ installed
- [ ] npm v9+ installed
- [ ] PostgreSQL running (or cloud database URL)
- [ ] Database created and accessible
- [ ] SMTP credentials configured (or use test provider)
- [ ] .env.local file with all required variables
- [ ] All dependencies installed (npm install)
- [ ] Database migrations applied (npx prisma db push)

---

**Last Updated:** 2026-11-19
**Setup Status:** Code ready, requires npm installation to run locally
