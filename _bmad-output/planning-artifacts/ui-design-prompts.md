# UI Design Specifications & Prompts (Enterprise Design System)

This document outlines the complete list of pages for the `whatsappAPI` SaaS and provides detailed prompts to generate high-fidelity mockups.

**Design Aesthetic (Enterprise):**
- **Style:** Clean, Professional, Trustworthy (Stripe/Vercel inspired).
- **Theme:** Light Mode (Crisp White backgrounds, Light Grey surfaces).
- **Accents:** Deep Forest Green (WhatsApp Brand) and Navy Blue (Trust).
- **Typography:** Inter or Helvetica Now. Highly readable, professional.
- **Components:** Solid cards with soft drop shadows, refined borders, clear data visualization.

---

## 1. Public Site & Marketing

### 1.1 Landing Page
**Description:** The main storefront. Needs to convert developers and businesses.
**Key Elements:** Hero with "Connect in 30s", Code Snippet animation, Social Proof logos, Feature Grid, Pricing Cards.
**Prompt:**
> A professional B2B SaaS landing page design for a WhatsApp API service. Light mode. Clean white background. Hero section features a bold strong serif headline "Enterprise-Grade WhatsApp Infrastructure" and a screenshot of the dashboard in a browser frame with a soft shadow. Navigation bar is white with a "Sign Up" button in deep green. The layout is structured, using high-quality icons and ample whitespace. Corporate, trustworthy, reliable aesthetic. --ar 16:9

### 1.2 Pricing Page
**Description:** Clear comparison of plans (Free, Starter, Pro).
**Key Elements:** Toggle (Monthly/Yearly), 3 Cards (different heights), "Most Popular" badge, FAQ accordion below.
**Prompt:**
> A clean pricing page for an enterprise API. Light theme. Three pricing columns on a white background. The cards have subtle grey borders and soft shadows. The "Pro Plan" is highlighted with a faint green background tint and a solid green button. Typography is crisp and grey-scale. Trust badges (GDPR, ISO) displayed below. professional, minimal. --ar 16:9

### 1.3 Documentation Hub
**Description:** Developer-centric documentation viewer (Mintlify style).
**Key Elements:** Left Sidebar (Tree nav), Center Content (Markdown), Right Column (Table of Contents), Interactive API Playground.
**Prompt:**
> A technical documentation site. Light mode. Extremely clean and readable. Left sidebar is light grey with dark text navigation. Main content area is white. Code blocks utilize a high-contrast light syntax highlighting theme (like GitHub light). Right side API console is distinct but minimal. Focus on readability and information architecture. --ar 16:9

---

## 2. Onboarding & Authentication

### 2.1 Login / Register
**Description:** Simple, secure entry point.
**Key Elements:** Email/Password form, "Continue with Google/GitHub", Clean centered card.
**Prompt:**
> A secure corporate login screen. White card centered on a very light grey background. The card has a subtle shadow. "Welcome back" title in dark blue. Input fields have solid grey borders that turn blue on focus. Simple, no distractions. "Log in with SSO" option visible. --ar 16:9

### 2.2 Onboarding Wizard (Step 2: Connect)
**Description:** The critical "Aha!" moment page. Scanning the QR code.
**Key Elements:** Progress Bar (Step 2 of 3), Large QR Code display in center, Refresh button, Instructions "Open WhatsApp > Linked Devices".
**Prompt:**
> A clean onboarding wizard screen, step 2. White background. A progress stepper at the top showing "Account > Verification > Connect". Center stage is the QR Code inside a defined boarder. Next to it, step-by-step instructions with simple line-art icons. The design is reassuring and clear. Primary action buttons are deep green. --ar 16:9

---

## 3. Core Dashboard

### 3.1 Dashboard Overview
**Description:** High-level stats and health check.
**Key Elements:** 4 Stat Cards (Messages Sent, Success Rate, Active Sessions, Plan Usage). A graph showing volume over last 7 days. Recent Activity Log list.
**Prompt:**
> A professional SaaS dashboard UI. Light theme. Top row features 4 clean stat cards with white backgrounds and drop shadows. Metrics are bold dark text. A large analytics chart in the center uses smooth blue and green lines on a white grid. The layout is grid-based, orderly, and information-dense but not cluttered. Left sidebar navigation is dark navy blue for contrast. Enterprise software aesthetic. --ar 16:9

### 3.2 Session Management ('Instances')
**Description:** Managing the WhatsApp connections.
**Key Elements:** List of connected numbers. Status badges (Connected (Green), Disconnected (Red)). Action buttons (Restart, Delete, View Logs). "Add New Session" button.
**Prompt:**
> An enterprise data grid showing "Connected Instances". Light mode. The table has a header row with grey background. Rows are white with separators. Status badges are pill-shaped with soft pastel colors (Green text on light green bg). Action buttons are outlined. The design prioritizes clarity and data readability. --ar 16:9

### 3.3 Message Debugger / Sandbox
**Description:** A manual testing tool for developers.
**Key Elements:** Form (To Number, Type Select, Body), "Send" button. Result JSON viewer side-by-side. History log below.
**Prompt:**
> A developer testing tool inside a corporate dashboard. Split view. Left panel is a structured form with labelled inputs on a white background. Right panel is a code response viewer with a light grey background and monosapce font. Buttons are standard height with rounded corners. Functional and clean. --ar 16:9

---

## 4. Advanced Features

### 4.1 Webhooks & Events Configuration
**Description:** The configuration page from Epic 3.
**Key Elements:** Webhook URL Input, "Secret Key" reveal eye. Grid of Checkboxes for the 22 events (grouped by category). "Test Endpoint" button.
**Prompt:**
> A configuration settings page. Light theme. Section headers are bold. Input fields are wide and clearly labelled. The events checklist is organized into columns with category titles. Toggle switches use brand green color. The overall feel is administrative and robust. --ar 16:9

### 4.2 Billing & Subscription
**Description:** Managing money and limits.
**Key Elements:** Current Plan card (Pro). Usage progress bars (80% of monthly quota). Invoices table. "Upgrade Plan" CTA.
**Prompt:**
> A billing overview page. Light mode. A summary card shows "Pro Plan" with a usage bar. Below is a standard invoice history table. "Update Payment Method" links are clear blue text. Professional finance dashboard look. --ar 16:9

### 4.3 Admin User Management
**Description:** For the SaaS Owner.
**Key Elements:** Users Table with search. Columns: Email, Plan, Msgs/Month, Status. "Ban" button in row actions.
**Prompt:**
> A system admin user table. Dense information layout. Light background. Search bar at the top right. Pagination at the bottom. The table is strictly aligned. Status indicators are small coloured dots. Efficient, high-density data design. --ar 16:9
