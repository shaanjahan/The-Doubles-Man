import React from 'react';
import ReactMarkdown from 'react-markdown';
import SitePage from '@/components/SitePage';

const EMAIL = 'mailto:thedoublesmanapp@gmail.com';

const CONTENT = `# Support — The Doubles Man

## Need help?

Email **[thedoublesmanapp@gmail.com](${EMAIL})** and we'll get back to you within 2 business days. Please include the email address on your account and, if it's about a purchase, the date and what you bought.

## Common questions

### I bought something and it didn't arrive.

Open the Store and tap **Restore Purchases** at the bottom. That re-checks your purchase history with Apple and re-delivers anything that didn't land. If it's still missing after that, email us with the date of the purchase and we'll sort it out manually.

### I got a new phone — where did my VIP go?

Sign in with the same account you used before, open the Store, and tap **Restore Purchases**. VIP Vendor Pass is a permanent unlock and restores on any device.

### My coins or gems are missing.

Your progress is saved to your account, not to your phone. Make sure you're signed in with the same sign-in method you used before — signing in with Google when you originally used Apple creates a separate account. If you're on the right account and progress is still missing, email us.

### I want a refund.

Purchases in the iOS app are handled by Apple and purchases in the Android app are handled by Google, so refunds have to go through them, not us. For Apple, visit reportaproblem.apple.com. For Google, use the Play Store's order history. We can't issue refunds on their behalf.

### I want to delete my account.

See our [account deletion page](/delete-account).

### I found a bug.

Please tell us — email [thedoublesmanapp@gmail.com](${EMAIL}) with what happened and what device you're on.

## Contact

The Doubles Man is made by Lamae Maharaj.
Email: **[thedoublesmanapp@gmail.com](${EMAIL})**
`;

export default function SupportPage() {
  return (
    <SitePage title="Support — The Doubles Man">
      <div className="doc-content">
        <ReactMarkdown>{CONTENT}</ReactMarkdown>
      </div>
    </SitePage>
  );
}