import React from 'react';
import ReactMarkdown from 'react-markdown';
import SitePage from '@/components/SitePage';
import { TERMS_CONTENT } from '@/lib/legalContent';

export default function TermsPage() {
  return (
    <SitePage title="Terms of Service — The Doubles Man">
      <div className="doc-content">
        <ReactMarkdown>{TERMS_CONTENT}</ReactMarkdown>
      </div>
    </SitePage>
  );
}