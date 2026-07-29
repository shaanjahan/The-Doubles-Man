import React from 'react';
import ReactMarkdown from 'react-markdown';
import SitePage from '@/components/SitePage';

const EMAIL = 'mailto:thedoublesmanapp@gmail.com?subject=Delete%20my%20account';

const CONTENT = `# Delete Your Account — The Doubles Man

## Delete your account and data

You can permanently delete your The Doubles Man account and everything associated with it at any time. You do not need to have the app installed.

### How to delete your account

Open the **Hub** in the app, tap the **settings icon** on your Vendor Profile card, and choose **Delete Account**. You'll be asked to confirm, and the deletion is processed immediately and permanently.

### You can also email us

If you'd rather not use the in-app option — for example, if you no longer have the app installed — email **[thedoublesmanapp@gmail.com](${EMAIL})** from the address on your account, with the subject line **Delete my account**. We'll confirm we've received it, and the deletion will be completed within 30 days.

### What gets deleted

Your account and sign-in details, your game progress — score, level, and everything you've unlocked — your coins, gems, and Magic Sauce balances, your items and cosmetics including VIP status, and your entries on the leaderboard.

### What we keep, and why

We retain records of purchases you made — the product, amount, date, and transaction ID — because tax and accounting law requires us to. These records are kept separately and are not linked to a usable account. They contain no payment card details, because we never receive those.

### Before you delete

This cannot be undone. Deleting your account permanently removes your progress and any virtual currency or items you've bought, including the VIP Vendor Pass, and none of it is refundable. If you sign up again later you'll be starting from zero, and previous purchases cannot be restored to the new account.

If you just want to stop playing, you can delete the app without deleting your account — your progress stays saved and will be there if you come back.

### Questions

**[thedoublesmanapp@gmail.com](${EMAIL})**
`;

export default function DeleteAccountPage() {
  return (
    <SitePage title="Delete Your Account — The Doubles Man">
      <div className="doc-content">
        <ReactMarkdown>{CONTENT}</ReactMarkdown>
      </div>
    </SitePage>
  );
}