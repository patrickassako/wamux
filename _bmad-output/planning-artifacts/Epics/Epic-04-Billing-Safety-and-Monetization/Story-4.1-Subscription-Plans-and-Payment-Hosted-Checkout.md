# ### Story 4.1: Subscription Plans & Payment (Hosted Checkout)

As a system owner,
I want to offer recurring subscription plans (Starter/Pro) via Stripe/Flutterwave,
So that users pay automatically to access the platform.

**Acceptance Criteria:**

**Given** a user selects a plan on the dashboard
**When** they click "Subscribe"
**Then** they should be redirected to a Hosted Checkout Page (Stripe/Flutterwave)
**When** payment is successful
**Then** a webhook (`checkout.session.completed`) should update the user's `subscription_status` to `active` in the DB

