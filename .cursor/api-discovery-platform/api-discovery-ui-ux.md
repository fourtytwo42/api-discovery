# API Discovery Platform - UI/UX Specification

**Complete UI/UX specification for all pages, screens, components, and user flows.**

## Design System

### Color Palette

**Primary Colors:**
- **Primary:** `#6366F1` (Indigo-500) - Not solid purple or blue, modern indigo
- **Primary Dark:** `#4F46E5` (Indigo-600)
- **Primary Light:** `#818CF8` (Indigo-400)

**Accent Colors:**
- **Success:** `#10B981` (Emerald-500)
- **Warning:** `#F59E0B` (Amber-500)
- **Error:** `#EF4444` (Red-500)
- **Info:** `#06B6D4` (Cyan-500)

**Neutral Colors (Dark Mode Default):**
- **Background:** `#0F172A` (Slate-900)
- **Surface:** `#1E293B` (Slate-800)
- **Surface Elevated:** `#334155` (Slate-700)
- **Border:** `#475569` (Slate-600)
- **Text Primary:** `#F1F5F9` (Slate-100)
- **Text Secondary:** `#CBD5E1` (Slate-300)
- **Text Muted:** `#94A3B8` (Slate-400)

**Neutral Colors (Light Mode):**
- **Background:** `#FFFFFF` (White)
- **Surface:** `#F8FAFC` (Slate-50)
- **Surface Elevated:** `#F1F5F9` (Slate-100)
- **Border:** `#E2E8F0` (Slate-200)
- **Text Primary:** `#0F172A` (Slate-900)
- **Text Secondary:** `#475569` (Slate-600)
- **Text Muted:** `#64748B` (Slate-500)

### Typography

**Font Family:**
- **Primary:** Inter (sans-serif)
- **Monospace:** JetBrains Mono (code blocks, API responses)

**Font Sizes:**
- **Hero:** 4rem (64px) / 3rem (48px) mobile
- **H1:** 3rem (48px) / 2.25rem (36px) mobile
- **H2:** 2rem (32px) / 1.75rem (28px) mobile
- **H3:** 1.5rem (24px) / 1.25rem (20px) mobile
- **Body:** 1rem (16px)
- **Small:** 0.875rem (14px)
- **Tiny:** 0.75rem (12px)

### Spacing

**Scale:** 4px base unit
- **XS:** 4px (0.25rem)
- **SM:** 8px (0.5rem)
- **MD:** 16px (1rem)
- **LG:** 24px (1.5rem)
- **XL:** 32px (2rem)
- **2XL:** 48px (3rem)
- **3XL:** 64px (4rem)

### Animations & Effects

**Transitions:**
- **Fast:** 150ms ease-out
- **Medium:** 250ms ease-out
- **Slow:** 350ms ease-out

**Animations:**
- **Fade In:** Opacity 0 → 1 with translateY(-10px) → 0
- **Slide In:** TranslateX(-100%) → 0
- **Scale In:** Scale(0.95) → 1 with opacity 0 → 1
- **Pulse:** Scale animation for loading states
- **Shimmer:** Gradient animation for skeleton loaders

**Advanced Effects:**
- **Gradient Backgrounds:** Animated gradients for hero sections
- **Glass Morphism:** Backdrop blur for modals and cards
- **Particle Effects:** Subtle particle animations in hero (CSS or lightweight library)
- **Micro-interactions:** Hover effects, button press animations
- **Smooth Scrolling:** CSS scroll-behavior smooth

### Components

**Buttons:**
- Primary: Indigo background, white text, hover scale effect
- Secondary: Transparent background, indigo border, indigo text
- Ghost: Transparent, text only
- Icon buttons: Circular, icon centered

**Cards:**
- Rounded corners (8px-12px)
- Shadow: `0 4px 6px rgba(0, 0, 0, 0.1)` (light) / `0 4px 6px rgba(0, 0, 0, 0.3)` (dark)
- Hover: Lift effect (translateY(-2px) with increased shadow)

**Inputs:**
- Rounded corners (6px)
- Border on focus: 2px primary color
- Placeholder: Muted text color
- Error state: Red border, error message below

**Modals:**
- Backdrop: Dark overlay with backdrop-blur
- Modal: Centered, rounded corners, shadow
- Close button: Top-right corner

---

## Page Specifications

### 1. Landing Page (`/`)

**Purpose:** Sell the SaaS product, convert visitors to users

**Header:**
- Logo (left, links to home)
- Navigation: Features, Pricing, Docs, Contact (center)
- Login button, Sign Up button (right)
- Theme toggle (right, icon only)
- Mobile: Hamburger menu with all navigation items

**Hero Section:**
- Large headline: "Discover, Document, and Test APIs Automatically"
- Subheadline: "Capture API calls through our proxy and generate comprehensive documentation in minutes"
- CTA buttons:
  - Primary: "Start Free Trial" (links to `/register`)
  - Secondary: "View Demo" (links to `/login` - auto-scrolls to demo account selector)
- Animated gradient background (indigo theme, smooth animation)
- Subtle particle effects: Use CSS animations only (no external libraries - pure CSS gradients and transforms)
- Visual: Screenshot of dashboard/endpoint view (static image, no animated GIF)

**Features Section:**
- Grid of 3-4 feature cards (responsive: 1 col mobile, 2 col tablet, 4 col desktop)
- Each card:
  - Icon (animated on hover)
  - Title (bold)
  - Description (2-3 lines)
  - Hover effect: Scale up slightly, shadow increase
- Features to highlight:
  1. "Zero Integration" - No code changes required
  2. "AI-Powered Docs" - Comprehensive documentation generation
  3. "Real-Time Capture" - Capture APIs as you use the app
  4. "Export Anywhere" - CSV, printable, or Markdown files

**How It Works Section:**
- Step-by-step process (numbered 1-2-3-4)
- Visual flow: Large numbers with icons
- Each step:
  - Number badge (indigo background)
  - Icon
  - Title
  - Description
- Visual flow diagram connecting steps (arrow lines)

**Pricing Section:**
- Title: "Simple, Transparent Pricing"
- Three-tier pricing cards:
  - **Free Tier Card:**
    - "Free" badge
    - "4 Endpoints Free" prominently displayed
    - "100 Credits on Signup"
    - Feature list: Basic documentation, Public sharing, Community support
    - CTA: "Get Started Free" (links to `/register`)
  - **Pro Tier Card (Highlighted):**
    - "Pro" badge
    - "$15/month"
    - "Unlimited Endpoints" prominently displayed
    - Feature list: Unlimited endpoints, Continuous monitoring, Change detection, Private docs, Priority support
    - CTA: "Upgrade to Pro" (links to `/register` or subscription page if logged in)
  - **Team Tier Card:**
    - "Team" badge
    - "$50/month"
    - "Everything in Pro + Team Features" prominently displayed
    - Feature list: Everything in Pro + Team collaboration, Shared endpoints, Admin controls
    - CTA: "Upgrade to Team" (links to `/register` or subscription page if logged in)
- **Credit Pack (Below tiers):**
  - "Credit Pack: 100 Credits for $20" (one-time purchase)
  - Breakdown: "25 Credits per URL = 4 URLs per purchase"
  - For occasional users
  - **Sandbox Mode Indicator** (if enabled):
    - "Currently in Sandbox Mode"
    - "Use any credit card - no verification required"
    - Demo card number displayed: "4242 4242 4242 4242"
    - Small text: "For testing purposes only"
- Feature comparison table (Free vs Pro vs Team)
- "Browse Public Docs" link (shows network effects)

**Testimonials/Social Proof:**
- Customer quotes: None initially (can add later, not in MVP)
- Usage statistics: "X endpoints documented", "Y API calls captured" (show actual numbers from database)
- Company logos: None initially (not in MVP)
- Trust badges: SSL badge only (HTTPS indicator)

**Footer:**
- Company info: Studio42.dev
- Links columns:
  - Product: Features, Pricing, Docs
  - Company: Contact (links to external Studio42.dev contact page)
  - Legal: Privacy, Terms (links to external Studio42.dev pages if available, or placeholders)
  - No social media links (not in MVP)
- Contact link: https://studio42.dev/contact?source=api-discovery
- Copyright notice
- Theme toggle (small, bottom-right)

**Features Section:**
- Grid of 3-4 feature cards
- Icons, titles, descriptions
- Hover effects (scale, shadow)
- Each card links to detailed feature page or scrolls to more info

**How It Works Section:**
- Step-by-step process (1-2-3-4)
- Visual flow diagram or illustrations
- Each step explained clearly

**Pricing Section:**
- Credit system explained
- "100 Credits for $20" highlighted
- "25 Credits per URL" breakdown
- CTA button: "Buy Credits" (links to register/checkout)
- Demo card info displayed (for sandbox mode)

**Testimonials/Social Proof:**
- Customer quotes
- Usage statistics
- Company logos (if applicable)

**Footer:**
- Company info
- Links: Features, Pricing, Docs, Contact, Privacy, Terms
- Social media links (if applicable)
- Copyright

**Mobile:**
- Stacked layout
- Smaller text sizes
- Touch-friendly buttons (min 44px height)
- Hamburger menu for navigation

---

### 2. Login Page (`/login`)

**Purpose:** Authenticate users, provide demo account access

**Header:**
- Logo (center or left)
- "Don't have an account? Sign Up" link (top-right)
- Theme toggle

**Main Content:**
- Centered form (max-width: 400px)
- Title: "Welcome Back"
- Login form:
  - Email/Username input
  - Password input (with show/hide toggle)
  - "Remember me" checkbox
  - "Forgot password?" link
  - Submit button: "Login"
- Divider: "OR"
- **Demo Account Selector:**
  - Title: "Try with Demo Account"
  - Cards for each demo user (3 cards):
    - Username
    - Email
    - "Use Demo Account" button
  - Clicking a card auto-fills credentials and submits
  - Visual feedback on hover/click

**Footer:**
- Links to register, forgot password, contact

**Mobile:**
- Full-width form
- Stacked demo account cards

---

### 3. Register Page (`/register`)

**Purpose:** Create new user account

**Header:**
- Logo
- "Already have an account? Login" link
- Theme toggle

**Main Content:**
- Centered form (max-width: 400px)
- Title: "Create Account"
- Registration form:
  - Email input
  - Username input (optional, can be null - user doesn't need username)
  - Password input (with strength indicator)
  - Confirm password input
  - Terms of service checkbox
  - Submit button: "Create Account"
- Link to login page

**Mobile:**
- Full-width form
- Stacked inputs

---

### 4. Dashboard (`/dashboard`)

**Purpose:** User's main hub, view endpoints, credits, usage

**Header (Global):**
- Logo (left, links to dashboard)
- Navigation: Dashboard, Endpoints, Credits, Settings (center)
- Credits balance display (right, highlighted)
- User menu dropdown (avatar/name):
  - Profile
  - Settings
  - Logout
- Theme toggle

**Main Content:**
- **Stats Cards (Top Row):**
  - Subscription tier badge (Free/Pro/Team) with upgrade link if Free
  - Total Endpoints (count)
  - Endpoints within free tier limit (if Free tier, shows "X/4 free endpoints used")
  - Total API Calls Captured (count)
  - Credits Remaining (number)
  - Active Endpoints (count)
  - Changes Detected (if monitoring enabled, shows count of API changes)
- **Recent Activity:**
  - List of recent endpoints created
  - Recent API calls
- **Quick Actions:**
  - "Create New Endpoint" button
  - "Upgrade to Pro" button (if Free tier)
  - "Buy Credits" button (for credit packs)
- **Monitoring Alerts (if changes detected):**
  - Notification cards showing recent API changes
  - Link to view change details
- **Endpoints List:**
  - Cards for each endpoint
  - Status badge (Active, Review, Processing, Monitoring, Complete)
  - Quick stats (API calls, discovered endpoints)
  - Actions: View, Delete

**Sidebar (Desktop only, 1024px+):**
- Always visible on large screens (lg breakpoint and up)
- Collapsible on medium screens (md breakpoint)
- Contains: Quick stats, navigation shortcuts, user menu

**Mobile:**
- Stacked stats cards
- Single column layout
- Bottom navigation bar (optional)

---

### 5. Create Endpoint Page (`/dashboard/endpoints/create`)

**Purpose:** User purchases/creates new proxy endpoint

**Header:**
- Back button
- Title: "Create New Endpoint"
- Breadcrumbs: Dashboard > Endpoints > Create

**Main Content:**
- **Step 1: Destination URL**
  - Input field for destination URL
  - Validation: Must be valid HTTP/HTTPS URL
  - Preview: Shows what URL will be proxied
- **Step 2: Credit Cost Display**
  - Shows: "This will cost 25 credits"
  - Shows remaining credits: "You have X credits"
  - Warning if insufficient credits
- **Step 3: Purchase (if needed)**
  - If insufficient credits: "Buy Credits" button
  - Links to credits purchase page
- **Step 4: Confirm & Create**
  - Review summary
  - "Create Endpoint" button
  - Creates endpoint, deducts credits, generates proxy URL

**Result:**
- Success message
- Display proxy URL: `https://api-discovery.dev/proxy/{endpoint-id}`
- "Copy Link" button
- "Start Using" button (opens proxy URL)
- "View Endpoint" button (links to endpoint details)

**Mobile:**
- Single column form
- Full-width inputs

---

### 6. Endpoint Details Page (`/dashboard/endpoints/[id]`)

**Purpose:** View endpoint details, captured API calls, trigger documentation generation

**Header:**
- Back button
- Title: "Endpoint: [Name or URL]"
- Status badge (Active, Processing, Complete)
- Actions menu:
  - View Proxy URL
  - Delete Endpoint
  - Export Data

**Main Content:**
- **Endpoint Info Card:**
  - Destination URL
  - Proxy URL (with copy button)
  - Created date
  - Last used date
  - Status
- **API Calls Section:**
  - Table/list of captured API calls
  - Filters: Method, Status Code, Date
  - Search functionality
  - Pagination
  - Each row: Method, URL, Status Code, Timestamp, Duration
- **Preview Data Section (Before Processing):**
  - "API Calls Captured: X"
  - "Unique Endpoints Detected: Y"
  - "Review API Data" button
  - Opens modal showing summary of captured data
- **Generate Documentation Section:**
  - "Generate Documentation" button (only if endpoint is Active/Review)
  - Progress indicator: Shows percentage complete and current endpoint being processed (real-time via WebSocket)
  - Shows: "This will process X API calls and generate documentation"
  - Modal appears after clicking: "Keep Monitoring?" with options:
    - "Finish" button (removes proxy, status → COMPLETE)
    - "Keep Monitoring" button (keeps proxy active, status → MONITORING)
  - "Confirm & Generate" button (proceeds to processing)
- **Discovered Endpoints (After Processing):**
  - List of discovered endpoints
  - Each endpoint card:
    - Pattern (e.g., `/api/users/:id`)
    - Methods (GET, POST, etc.)
    - Description (AI-generated)
    - View details link
- **Documentation (After Processing):**
  - Links to view documentation
  - Export options: CSV, Printable, ZIP

**Mobile:**
- Stacked cards
- Scrollable table
- Full-width buttons

---

### 7. API Data Preview Modal (Before Processing)

**Purpose:** Show user what API data was captured before they decide to process

**Modal Content:**
- Title: "Review Captured API Data"
- **Summary:**
  - Total API calls: X
  - Unique endpoints: Y
  - Date range: Start - End
- **Endpoint Breakdown:**
  - List of unique endpoint patterns detected
  - Methods for each endpoint
  - Number of calls per endpoint
- **Sample Requests:**
  - Shows a few sample requests/responses
  - Collapsible sections
- **Actions:**
  - "Generate Documentation" button (proceed to monitoring choice modal)
  - "Capture More Data" button (cancel, continue using proxy)
  - "Cancel" button (close modal)

---

### 7.5. Keep Monitoring Modal (After Documentation Generation)

**Purpose:** User chooses whether to keep proxy active for monitoring or finish

**Modal Content:**
- Title: "Documentation Generated Successfully!"
- **Summary:**
  - Documentation generated for X endpoints
  - Action sequence recorded for future replay
- **Choice Options:**
  - **"Keep Monitoring" Button:**
    - Description: "Keep proxy active and automatically check for API changes"
    - Benefits: "Get notified when APIs change, continuous monitoring"
    - Status: MONITORING (proxy stays active)
  - **"Finish" Button:**
    - Description: "Remove proxy, use stored data only"
    - Benefits: "Documentation complete, no ongoing monitoring"
    - Status: COMPLETE (proxy removed)
- **Info:**
  - If monitoring: "System will replay your actions periodically to detect changes"
  - If finish: "You can enable monitoring later if needed"
- "Confirm" button (after selecting option)

---

### 8. Credits Page (`/dashboard/credits`)

**Purpose:** View credit balance, purchase credits

**Header:**
- Title: "Credits"
- Current balance display (large, prominent)

**Main Content:**
- **Current Balance Card:**
  - Large number display
  - "Credits remaining"
  - Info: "1 URL = 25 credits"
- **Purchase Credits Section:**
  - Pricing: "100 Credits for $20"
  - Fixed quantity: 100 credits only (no quantity selector, fixed package)
  - Payment method selector:
    - Stripe (always enabled if admin configured)
    - PayPal (always enabled if admin configured)
    - User selects which provider to use
    - Sandbox mode indicator (if enabled)
  - **Demo Card Info (if sandbox mode):**
    - Card: "Use any credit card"
    - "No verification required in sandbox mode"
    - Example card number displayed (e.g., "4242 4242 4242 4242")
  - Checkout button
- **Transaction History:**
  - Table of credit purchases
  - Date, Amount, Credits, Status

**Mobile:**
- Stacked layout
- Full-width purchase section

---

### 9. Credits Checkout Page (`/dashboard/credits/checkout`)

**Purpose:** Complete credit purchase

**Header:**
- Title: "Purchase Credits"
- Back button

**Main Content:**
- **Order Summary:**
  - Credits: 100
  - Price: $20.00
  - Total: $20.00
- **Payment Form:**
  - Stripe Elements or PayPal button
  - Card input (Stripe Elements if Stripe selected, PayPal button if PayPal selected)
  - Billing info
  - Sandbox indicator (if enabled)
- **Submit Button:**
  - "Pay $20.00"
  - Loading state during processing
- **Security Indicators:**
  - SSL badge
  - Payment provider logos

**Mobile:**
- Stacked form
- Full-width inputs

---

### 10. Settings Page (`/dashboard/settings`)

**Purpose:** User account settings

**Header:**
- Title: "Settings"
- Save button (always visible, disabled until form changes detected)

**Main Content:**
- **Profile Section:**
  - Email (read-only or editable)
  - Username
  - Change password
- **Preferences:**
  - Theme (Dark/Light)
  - Email notifications: Not implemented (no email sending, settings UI only for future feature)
  - Default settings
- **Danger Zone:**
  - Delete account button

**Mobile:**
- Stacked sections
- Full-width inputs

---

### 11. Admin Dashboard (`/admin`)

**Purpose:** Admin control panel (only accessible to ADMIN users)

**Header:**
- "Admin" badge/indicator
- Navigation: Dashboard, Users, Endpoints, Credits, Payments, Audit Log, Settings

**Main Content:**
- **Stats Cards:**
  - Total Users
  - Total Endpoints
  - Total Revenue
  - Active Endpoints
- **Recent Activity:**
  - Recent user registrations
  - Recent credit purchases
  - Recent endpoint creations
- **Quick Actions:**
  - View audit log
  - Manage users
  - Payment settings

---

### 12. Admin Users Page (`/admin/users`)

**Purpose:** Manage all users

**Content:**
- **Users Table:**
  - Columns: Email, Username, Role, Status, Credits, Created, Actions
  - Search/filter functionality
  - Pagination
- **Actions per User:**
  - View details
  - Edit user
  - Adjust credits (add/remove)
  - Suspend/activate
  - Delete user
- **Bulk Actions:**
  - Export user list
  - Bulk operations

---

### 13. Admin Settings Page (`/admin/settings`)

**Purpose:** Configure payment providers, sandbox mode, system settings

**Content:**
- **Payment Settings:**
  - Stripe Configuration:
    - Enable/Disable toggle
    - Sandbox mode toggle
    - Enable/Disable toggle (default: enabled)
    - Sandbox mode toggle (default: enabled/sandbox)
    - Public key input (required if enabled)
    - Secret key input (required if enabled, masked with show/hide toggle)
    - Test mode indicator (shows "TEST MODE" badge when sandbox enabled)
  - PayPal Configuration:
    - Enable/Disable toggle (default: enabled)
    - Sandbox mode toggle (default: enabled/sandbox)
    - Client ID input (required if enabled)
    - Client Secret input (required if enabled, masked with show/hide toggle)
    - Test mode indicator (shows "TEST MODE" badge when sandbox enabled)
  - Save button
- **Credit Settings:**
  - Free credits on signup (default: 100)
  - Credits per URL (default: 25)
  - Credits per purchase (default: 100)
  - Price per purchase (default: $20)
- **Subscription Settings:**
  - Pro tier price (default: $15/month)
  - Team tier price (default: $50/month)
  - Enable/disable subscriptions toggle
- **System Settings:**
  - Site name
  - Contact email
  - Maintenance mode toggle

---

### 14. Admin Audit Log Page (`/admin/audit`)

**Purpose:** View all system activity for auditability

**Content:**
- **Filters:**
  - User filter
  - Action type filter
  - Date range filter
  - Endpoint filter
- **Audit Log Table:**
  - Columns: Timestamp, User, Action, Resource, Details, IP Address
  - Search functionality
  - Pagination
  - Export button (CSV, JSON)
- **Actions Tracked:**
  - User login/logout
  - Endpoint creation/deletion
  - Credit purchase
  - Documentation generation
  - Admin actions (user management, settings changes)
  - All API operations

---

### 15. Subscription Management Page (`/dashboard/subscription`)

**Purpose:** Manage subscription tier, view billing, upgrade/downgrade

**Content:**
- Current subscription tier badge and status
- Feature comparison table (Free vs Pro vs Team)
- Current plan details:
  - Billing cycle
  - Next billing date
  - Amount charged
  - Payment method
- "Upgrade to Pro" / "Upgrade to Team" buttons (if on Free tier)
- "Manage Subscription" section:
  - Cancel subscription (cancels at end of period)
  - Update payment method
  - View billing history
- Subscription benefits highlighted
- FAQ section for subscription questions

**Upgrade Flow:**
1. User clicks "Upgrade to Pro/Team"
2. Modal: Confirm subscription tier and pricing
3. Payment method selection (Stripe/PayPal)
4. Payment processing
5. Success: Subscription activated, features unlocked
6. Redirect to dashboard with upgrade success message

---

### 16. Public Documentation Browse Page (`/docs/public`)

**Purpose:** Browse all publicly shared API documentation

**Content:**
- Page title: "Public API Documentation"
- Search bar (search by endpoint name, patterns, username)
- Filter options:
  - Sort by: Recent, Popular, Endpoint Count
  - Filter by API type (REST, GraphQL, WebSocket)
- Grid/list view toggle
- Documentation cards:
  - Endpoint name
  - Owner username
  - Endpoint count
  - Created/updated dates
  - Preview of API patterns
  - "View Documentation" button
- Pagination
- "Share Your Documentation" CTA (for authenticated users)

**SEO Optimization:**
- Meta tags for search engines
- Structured data (JSON-LD)
- Sitemap inclusion

---

### 17. Public Documentation View Page (`/docs/public/[endpointId]` or `/docs/[username]/[slug]`)

**Purpose:** View publicly shared API documentation (no auth required)

**Content:**
- Endpoint name and owner username
- "Shared by {username}" badge
- Full documentation content:
  - All discovered endpoints
  - Complete API documentation
  - OpenAPI spec (if available)
  - TypeScript types (if available)
- "Bookmark" button (for authenticated users)
- Social sharing buttons (Twitter, LinkedIn, etc.)
- Related documentation suggestions
- "Want to document your API?" CTA

**SEO Elements:**
- H1 with endpoint name
- Meta description
- OpenGraph tags
- Structured data markup

---

### 18. Contact Page (`/contact`)

**Purpose:** User can contact support

**Note:** Links to external contact page: https://studio42.dev/contact?source=api-discovery

**Implementation:**
- Contact links/buttons redirect to external Studio42.dev contact page
- Source parameter identifies traffic from API Discovery Platform
- No separate contact page in this application

**Links from:**
- Landing page footer
- Landing page header/navigation
- Dashboard (if needed)
- Help/support sections

---

## User Flows

### Flow 1: New User Registration & First Endpoint

1. Landing page → Click "Start Free Trial" → Register page
2. Fill registration form → Submit → Dashboard (0 credits)
3. Dashboard → "Create New Endpoint" → Create endpoint page
4. Enter destination URL → See "Insufficient credits" message
5. Click "Buy Credits" → Credits page
6. Select 100 credits for $20 → Checkout page
7. Enter payment info (demo card if sandbox) → Complete purchase
8. Return to create endpoint page → Enter destination URL
9. Click "Create Endpoint" → Endpoint created, credits deducted
10. View proxy URL → Copy link or "Start Using"
11. Use proxy URL to browse target site
12. API calls captured in real-time
13. View endpoint details → See captured API calls
14. Click "Review API Data" → Preview modal shows summary
15. Click "Generate Documentation" → Confirm
16. Processing → Documentation generated
17. View discovered endpoints and documentation

### Flow 2: Demo Account Usage

1. Landing page → Click "View Demo" → Login page
2. See demo account cards → Click "Use Demo Account"
3. Auto-filled and logged in → Dashboard (demo account has sample data)
4. View existing demo endpoints
5. Create new endpoint (uses demo credits)
6. Use proxy and generate documentation

### Flow 3: Admin Managing System

1. Admin login → Admin dashboard
2. View system stats
3. Navigate to Users → View user list
4. Click on user → View user details
5. Adjust credits → Save changes
6. Navigate to Settings → Payment settings
7. Configure Stripe/PayPal → Toggle sandbox mode
8. Navigate to Audit Log → View recent activity
9. Filter by user/action → Export audit log

---

## Responsive Design

### Breakpoints

- **Mobile:** < 640px (sm)
- **Tablet:** 640px - 1024px (md)
- **Desktop:** > 1024px (lg)
- **Large Desktop:** > 1280px (xl)

### Mobile Adaptations

**Navigation:**
- Hamburger menu for mobile
- No bottom navigation bar (use hamburger menu)
- Collapsible sidebar on desktop (always visible on large screens, collapsible on medium)

**Forms:**
- Full-width inputs
- Larger touch targets (min 44px)
- Stacked layout

**Tables:**
- Horizontal scroll or card layout
- Simplified columns

**Modals:**
- Full-screen on mobile
- Swipe to dismiss

---

## Accessibility

**Requirements:**
- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader support
- Focus indicators
- Color contrast ratios
- Alt text for images
- ARIA labels where needed

---

## Performance

**Optimizations:**
- Lazy loading images
- Code splitting
- Optimized animations (GPU-accelerated)
- Minimized CSS/JS
- CDN for assets
- Image optimization

---

## Browser Support

**Supported:**
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

**Mobile:**
- iOS Safari (latest 2 versions)
- Chrome Mobile (latest 2 versions)

