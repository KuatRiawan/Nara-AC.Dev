# NARA AC — BUG FIX & REMEDIATION LOG (`BUG-01` – `BUG-17`)

**Project:** NARA AC — Sistem Pengelolaan Jadwal dan Pengingat Service AC (`A26-CS054`)  
**Company Identity:** CV. Nara Teknindotama  
**Date:** 17 Oktober 2026  

---

## Summary Matrix of Remediated Bugs

| Bug ID | Title | Files Modified | Verification Outcome |
| :--- | :--- | :--- | :--- |
| **BUG-01** | Gallery Lightbox Viewport Positioning, Scroll Lock & Aspect Ratio | `frontend/src/components/landing/GallerySection.jsx` | **PASS** (Portal `z-[100]`, scroll lock/restore, `object-contain`, `Esc`/Arrow keys) |
| **BUG-02** | Smooth Animation & `prefers-reduced-motion` in Digital Experience Section | `frontend/src/components/landing/DigitalExperienceSection.jsx` | **PASS** (`useReducedMotion()`, `[0.22,1,0.36,1]` easing, stable height, `/customer/ac-units` link) |
| **BUG-03** | Exact Footer Copyright String Across All Layouts | `useBusinessProfile.js`, `LandingPage.jsx`, `BookingPage.jsx`, `StatusPage.jsx`, `LoginPage.jsx`, `RegisterPage.jsx`, `StaffLoginPage.jsx`, `FeedbackPage.jsx`, `TermsConditionsPage.jsx`, `PrivacyPolicyPage.jsx`, `NotFoundPage.jsx`, `CustomerPortal.jsx`, `DashboardLayout.jsx` | **PASS** (`© 2026 CV. Nara Teknindotama. Seluruh hak cipta dilindungi.` across all 12 footers) |
| **BUG-04** | Timeline Layout Alignment & Overflow Prevention | `StatusPage.jsx`, `LandingPage.jsx`, `TechnicianJobDetail.jsx` | **PASS** (5-stage timeline, `#cara-kerja` step headers, `overflow-hidden` progress track) |
| **BUG-05** | Admin Add/Edit Service Modal Clipping & Field Validation | `frontend/src/pages/admin/AdminServices.jsx`, `backend/src/routes/master.js` | **PASS** (`createPortal` at `z-[9999]`, field-level validation, `garansi_hari` `14/30/45`) |
| **BUG-06** | Operating Hours (`08:00–19:00` WIB) & Exact Duration Slot Boundary | `019_full_audit_remediation.sql`, `seed.js`, `bookingService.js`, `routes/bookings.js`, `BookingPage.jsx`, `StatusPage.jsx`, `AdminSettings.jsx`, `AdminCreateBookingModal.jsx`, `AdminSchedule.jsx`, `AdminBookings.jsx` | **PASS** (`Scenario J`: `18:00` valid for 60m, rejected with `DURATION_EXCEEDS_CLOSING` for 90m) |
| **BUG-07** | Modern Print-Ready Business Invoice Layout & Unmasked Verified Details | `OfficialInvoicePaper.jsx`, `BookingPage.jsx`, `StatusPage.jsx`, `routes/bookings.js` | **PASS** (Clean Trust Blue header, Initial vs Final badge, 10% member service-only discount) |
| **BUG-08** | Cohesive Trust Blue Color Palette (Removal of Midnight/Navy Surfaces) | `OfficialInvoicePaper.jsx`, `StickyBottomBooking.jsx`, `CustomerDashboard.jsx`, `CustomerProfile.jsx`, `TermsConditionsPage.jsx`, `PrivacyPolicyPage.jsx`, `Admin*.jsx` | **PASS** (Replaced `slate-900`/`blue-950` cards & buttons with Trust Blue tokens) |
| **BUG-09** | Real-Time Technician Progress Synchronization on Customer Status Page | `bookingService.js`, `StatusPage.jsx`, `BookingPage.jsx` | **PASS** (`Scenario J`: `progres_teknisi` checklist/photos/notes + 10s/focus polling) |
| **BUG-10** | Context-Aware Back Navigation & Role-Safe Breadcrumbs | `useContextualBack.js`, `Breadcrumb.jsx`, `BookingPage.jsx`, `StatusPage.jsx`, `LoginPage.jsx`, `RegisterPage.jsx`, `StaffLoginPage.jsx`, `FeedbackPage.jsx`, `TermsConditionsPage.jsx`, `PrivacyPolicyPage.jsx`, `NotFoundPage.jsx`, `TechnicianJobDetail.jsx` | **PASS** (Uses `navigate(-1)` when in-app history exists or role-aware fallback) |
| **BUG-11** | Complete 5-Category Analytics Dashboard + 14-Day Demand Forecast | `data-science/ingest_and_train.py`, `analyticsService.js`, `AdminAnalytics.jsx` | **PASS** (`Scenario J` & `test_pipeline.py`: all 5 categories + 14-day forecast) |
| **BUG-12** | Multipart Photo File Upload for Payment Proof | `backend/src/utils/upload.js`, `routes/payments.js`, `paymentService.js`, `StatusPage.jsx` | **PASS** (JPG/PNG/WEBP magic-byte validation up to 5 MB + preview & authorized serving) |
| **BUG-13** | Locked Read-Only Verified Phone Field & Server-Side OTP Change Flow | `CustomerProfile.jsx`, `LoginPage.jsx`, `StatusPage.jsx`, `routes/customer.js`, `routes/bookings.js`, `bookingService.js` | **PASS** (`Scenario J`: `readOnly` verified phone, 2-step OTP change flow, masked string rejection) |
| **BUG-14** | WhatsApp Invoice Dispatch Feedback, Guest Support & Cooldown | `routes/payments.js`, `paymentService.js`, `StatusPage.jsx` | **PASS** (`Scenario H & I`: `authOptional` with phone check, 60s cooldown, retry queue) |
| **BUG-15** | Recognition of Existing Customer Review in Warranty Claim Flow (Cases A–D) | `warrantyService.js`, `routes/customer.js`, `StatusPage.jsx`, `CustomerHistory.jsx` | **PASS** (`Scenario E & J`: `has_qualifying_review` recognized without duplicate review prompt) |
| **BUG-16** | End-to-End Warranty Claim Submission with Photo & Admin Field Aliases | `019_full_audit_remediation.sql`, `routes/claims.js`, `warrantyService.js`, `StatusPage.jsx`, `CustomerHistory.jsx`, `AdminClaims.jsx` | **PASS** (`Scenario E & J`: `foto_bukti_url` persisted, `booking_kode`/`kontak`/`alasan` mapped) |
| **BUG-17** | `technician_availability.teknisi_id` Column Fix & Active Capacity Subtraction | `backend/src/services/bookingService.js`, `backend/tests/e2e_audit_verification.test.js` | **PASS** (`Scenario B`: unavailable technician rejected with `409` conflict) |
| **CLEANUP** | Code Comment Cleanup Across Backend, Frontend, AI & DS Modules | 124 JS/JSX files & 10 Python files across `backend/`, `frontend/`, `ai-service/`, `data-science/` | **PASS** (`node --check` 39/39 PASS, 0 broken imports, all unit/E2E tests PASS) |

---

## Verification Commands & Actual Results

1. **Backend End-to-End & Regression Test Suite (`Scenarios A–J`):**
   - Command: `node --test backend/tests/e2e_audit_verification.test.js`
   - Result: **9/9 test suites PASS (0 failures)**
2. **Backend Static Syntax Verification:**
   - Command: `find backend/src -name "*.js" -exec node --check {} +`
   - Result: **39/39 files PASS**
3. **AI Service NLP & Entity Extraction Suite:**
   - Command: `python3 -m unittest discover -s ai-service -p "test_*.py" -v`
   - Result: **25/25 unit tests PASS**
4. **Data Science Governed Pipeline & Analytics Suite:**
   - Command: `python3 -m unittest discover -s data-science -p "test_*.py" -v`
   - Result: **9/9 unit tests PASS**
