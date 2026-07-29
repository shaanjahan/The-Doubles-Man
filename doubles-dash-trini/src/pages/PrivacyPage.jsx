import React from 'react';
import ReactMarkdown from 'react-markdown';
import SitePage from '@/components/SitePage';
import { PRIVACY_CONTENT } from '@/lib/legalContent';

export default function PrivacyPage() {
  return (
    <SitePage title="Privacy Policy — The Doubles Man">
      <div className="doc-content">
        <ReactMarkdown>{PRIVACY_CONTENT}</ReactMarkdown>
      </div>
    </SitePage>
  );
}