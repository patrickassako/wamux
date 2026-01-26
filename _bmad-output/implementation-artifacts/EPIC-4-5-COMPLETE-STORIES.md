# Epic 4 & 5: Billing, Safety & Growth - Stories Détaillées

## EPIC 4: BILLING, SAFETY & MONETIZATION

### Story 4.1: Subscription Plans & Payment (Hosted Checkout)

**Status:** ready-for-dev

**Acceptance Criteria:**
- 4 subscription plans: Free, Starter, Pro, Enterprise
- Stripe + Flutterwave integration (hosted checkout)
- Subscription status tracked in profiles table
- Automatic quota enforcement based on plan

**Tasks (8 tasks):**

1. **Define Subscription Plans**
   - Free: 100 msg/month, 1 session
   - Starter: $29/mo, 5K msg, 3 sessions
   - Pro: $99/mo, 50K msg, 10 sessions
   - Enterprise: Custom pricing

2. **Integrate Stripe Checkout**
   - Create Stripe products and prices
   - Implement hosted checkout flow
   - Handle webhook events (checkout.session.completed)
   - Update subscription_status on payment

3. **Integrate Flutterwave (Africa)**
   - Setup Flutterwave account
   - Create payment links
   - Handle payment webhooks
   - Support mobile money payments

4. **Create Subscriptions Table**
   - Track plan, status, expires_at
   - Link to profiles table
   - Store payment provider info

5. **Implement Subscription Endpoints**
   - POST /v1/subscriptions/checkout (create session)
   - GET /v1/subscriptions/current
   - POST /v1/subscriptions/cancel
   - GET /v1/subscriptions/invoices

6. **Add Quota Enforcement**
   - Check message quota before sending
   - Check session limit before creating
   - Return 402 Payment Required if exceeded

7. **Add Billing Dashboard UI**
   - Display current plan and usage
   - Upgrade/downgrade buttons
   - Invoice history

8. **Add Tests**
   - Test checkout flow
   - Test webhook handling
   - Test quota enforcement
   - Mock payment providers

**Implementation:**
```python
# Subscription plans
PLANS = {
    'free': {'messages': 100, 'sessions': 1, 'price': 0},
    'starter': {'messages': 5000, 'sessions': 3, 'price': 29},
    'pro': {'messages': 50000, 'sessions': 10, 'price': 99},
    'enterprise': {'messages': -1, 'sessions': -1, 'price': 'custom'}
}

# Quota check
async def check_message_quota(user_id: UUID):
    usage = await get_monthly_usage(user_id)
    plan = await get_user_plan(user_id)
    
    if usage >= PLANS[plan]['messages']:
        raise HTTPException(402, "Message quota exceeded")
```

---

### Story 4.2: Rate Limiting (Anti-Ban Protection)

**Status:** ready-for-dev

**Acceptance Criteria:**
- Token Bucket algorithm: 1 message per 10 seconds
- Per-session rate limiting
- Returns 429 Too Many Requests if exceeded
- Configurable limits per plan

**Tasks (7 tasks):**

1. **Implement Token Bucket Algorithm**
   - Store tokens in Redis
   - Refill rate: 1 token/10s
   - Bucket size: 5 tokens (burst)

2. **Create Rate Limiter Service**
   - Check tokens before sending
   - Decrement token on send
   - Return wait time if no tokens

3. **Add Rate Limit Headers**
   - X-RateLimit-Limit
   - X-RateLimit-Remaining
   - X-RateLimit-Reset

4. **Implement Per-Plan Limits**
   - Free: 1 msg/10s
   - Starter: 1 msg/5s
   - Pro: 1 msg/2s
   - Enterprise: 1 msg/1s

5. **Add Typing Simulation**
   - Calculate typing time based on message length
   - Send typing indicator before message
   - Delay message send to simulate human

6. **Add Monitoring**
   - Track rate limit hits
   - Alert on excessive rate limiting
   - Dashboard for rate limit stats

7. **Add Tests**
   - Test token bucket logic
   - Test burst handling
   - Test different plan limits

**Implementation:**
```python
class TokenBucket:
    async def consume(self, session_id: str, tokens: int = 1) -> bool:
        key = f"rate_limit:{session_id}"
        
        # Get current tokens
        current = await redis.get(key) or BUCKET_SIZE
        
        if current < tokens:
            return False  # Rate limited
        
        # Consume tokens
        await redis.decrby(key, tokens)
        await redis.expire(key, REFILL_INTERVAL)
        
        return True
```

---

### Story 4.3: Global Usage Quotas (Hard Limits)

**Status:** ready-for-dev

**Acceptance Criteria:**
- Monthly message quotas enforced
- Session limits enforced
- Usage tracked in real-time
- Dashboard shows usage vs quota

**Tasks (6 tasks):**

1. **Create Usage Tracking Table**
   - Track messages_sent, sessions_active per user
   - Reset monthly on subscription renewal
   - Store in usage_stats table

2. **Implement Quota Middleware**
   - Check quota before every message
   - Check session limit before creation
   - Return 402 if quota exceeded

3. **Add Usage Endpoints**
   - GET /v1/usage/current
   - GET /v1/usage/history
   - Include quota and remaining

4. **Implement Monthly Reset**
   - Cron job to reset usage on renewal date
   - Handle timezone differences
   - Send notification before reset

5. **Add Usage Dashboard**
   - Progress bars for quotas
   - Historical usage charts
   - Upgrade prompts when near limit

6. **Add Tests**
   - Test quota enforcement
   - Test monthly reset
   - Test usage tracking

---

### Story 4.4: Admin Dashboard & Kill Switch

**Status:** ready-for-dev

**Acceptance Criteria:**
- Admin can view all users and sessions
- Admin can pause/ban users
- Admin can view system health
- Kill switch to disable all messaging

**Tasks (7 tasks):**

1. **Create Admin Role**
   - Add is_admin flag to profiles
   - Implement admin authentication
   - Protect admin routes

2. **Build Admin Dashboard UI**
   - User list with search/filter
   - Session list with status
   - System metrics overview

3. **Implement User Management**
   - Pause user (disable API access)
   - Ban user (permanent disable)
   - View user activity logs

4. **Implement Kill Switch**
   - Global flag to disable messaging
   - Emergency stop for all sessions
   - Maintenance mode

5. **Add System Monitoring**
   - Redis health check
   - Database connection status
   - Active sessions count
   - Message throughput

6. **Add Audit Logging**
   - Log all admin actions
   - Track user bans/pauses
   - Export audit logs

7. **Add Tests**
   - Test admin authentication
   - Test user management
   - Test kill switch

---

## EPIC 5: PUBLIC SITE & GROWTH

### Story 5.1: Public Landing Page (Next.js)

**Status:** ready-for-dev

**Acceptance Criteria:**
- Modern landing page with hero section
- Pricing grid with 4 plans
- Features showcase
- CTA buttons to signup/docs

**Tasks (6 tasks):**

1. **Setup Next.js Project**
   - Initialize Next.js 14 with App Router
   - Configure TailwindCSS
   - Setup deployment to Vercel

2. **Build Hero Section**
   - Headline + subheadline
   - CTA buttons (Get Started, View Docs)
   - Hero image/animation

3. **Build Features Section**
   - 6-8 key features with icons
   - Benefits-focused copy
   - Code snippets preview

4. **Build Pricing Section**
   - 4 pricing cards (Free, Starter, Pro, Enterprise)
   - Feature comparison table
   - CTA buttons to signup

5. **Build Footer**
   - Links to docs, blog, support
   - Social media links
   - Legal pages (Terms, Privacy)

6. **Add SEO**
   - Meta tags
   - Open Graph images
   - Sitemap.xml

---

### Story 5.3: Interactive Onboarding Guide

**Status:** ready-for-dev

**Acceptance Criteria:**
- 3-step wizard: Create Account → Connect WhatsApp → Send First Message
- Progress indicator
- Code examples for each step
- Completion celebration

**Tasks (5 tasks):**

1. **Build Onboarding Wizard UI**
   - Step 1: Account creation
   - Step 2: QR code scanning
   - Step 3: Send test message

2. **Add Progress Tracking**
   - Save progress in localStorage
   - Resume from last step
   - Skip option for advanced users

3. **Add Code Examples**
   - cURL examples for each step
   - Copy-to-clipboard buttons
   - Language selector (cURL, Python, Node.js)

4. **Add Completion Screen**
   - Congratulations message
   - Next steps suggestions
   - Link to full documentation

5. **Add Tests**
   - Test wizard flow
   - Test progress saving
   - Test code examples

---

### Story 5.4: Blog & SEO Resources

**Status:** ready-for-dev

**Acceptance Criteria:**
- Blog with MDX support
- 5 initial articles (WhatsApp API guides)
- SEO optimized
- RSS feed

**Tasks (6 tasks):**

1. **Setup Blog Infrastructure**
   - MDX for blog posts
   - Blog listing page
   - Individual post pages

2. **Write Initial Articles**
   - "Getting Started with WhatsApp API"
   - "Sending Your First Message"
   - "Webhook Integration Guide"
   - "Rate Limiting Best Practices"
   - "WhatsApp Business API vs Official API"

3. **Add SEO Optimization**
   - Meta descriptions
   - Structured data (Article schema)
   - Internal linking

4. **Add RSS Feed**
   - Generate RSS from blog posts
   - Atom feed support

5. **Add Blog Features**
   - Tags/categories
   - Search functionality
   - Related posts

6. **Add Analytics**
   - Track page views
   - Monitor popular articles
   - A/B test headlines

---

## Implementation Priority

**Epic 4 (Critical for Monetization):**
1. Story 4.1 (Billing) - **HIGHEST PRIORITY**
2. Story 4.2 (Rate Limiting) - **CRITICAL for anti-ban**
3. Story 4.3 (Quotas) - Depends on 4.1
4. Story 4.4 (Admin) - Can be done last

**Epic 5 (Growth):**
1. Story 5.2 (Docs) - **ALREADY EXISTS**
2. Story 5.1 (Landing) - High priority for marketing
3. Story 5.3 (Onboarding) - Improves conversion
4. Story 5.4 (Blog) - Long-term SEO

---

## References

- [epics.md#L365-L487](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/epics.md#L365-L487) - Epics 4 & 5 context
- FR4, FR22-24: Billing & Payments
- FR20-21: Safety & Rate Limiting
- FR26-28: Public Site & Docs

## Total Effort Estimate

**Epic 4:** 3-4 weeks
**Epic 5:** 1-2 weeks

**Combined:** 4-6 weeks for full monetization and growth features
