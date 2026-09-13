// ==========================================================================
// KANIKAARA — Payment gateway config
// ==========================================================================
// 1. Sign up / log in at https://dashboard.razorpay.com
// 2. Settings → API Keys → Generate Key (use "Test Mode" first, switch to
//    Live once you've tested a full order end-to-end).
// 3. Paste the Key ID (starts with rzp_test_ or rzp_live_) below.
//    NEVER put the Key Secret here or anywhere in frontend code — it stays
//    only inside your Razorpay dashboard / a backend, never in the browser.
const RAZORPAY_KEY_ID = 'rzp_test_REPLACE_WITH_YOUR_KEY_ID';
