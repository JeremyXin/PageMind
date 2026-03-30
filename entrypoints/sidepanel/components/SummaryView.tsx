import { useState } from 'react';
import type { SummaryResult } from '~/utils/types';

interface SummaryViewProps {
  result: SummaryResult;
}

interface SectionProps {
  title: string;
  icon: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  isEmpty?: boolean;
}

function Section({ title, icon, children, defaultOpen = true, isEmpty = false }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between text-left"
      >
        <span className="flex items-center gap-2 font-medium text-gray-900">
          <span className="text-lg">{icon}</span>
          <span>{title}</span>
        </span>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className={`px-4 py-3 bg-white ${isEmpty ? 'text-gray-500 italic' : 'text-gray-700'}`}>
          {children}
        </div>
      )}
    </div>
  );
}

export default function SummaryView({ result }: SummaryViewProps) {
  const hasBestPractices = result.bestPractices && result.bestPractices.length > 0;

  return (
    <div className="space-y-3">
      {/* Summary Section */}
      <Section title="摘要" icon="📋">
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{result.summary}</p>
      </Section>

      {/* Key Points Section */}
      <Section title="重点" icon="🔑">
        <ul className="space-y-2">
          {result.keyPoints.map((point, index) => (
            <li key={index} className="flex gap-2 text-sm">
              <span className="text-blue-600 font-bold mt-0.5">•</span>
              <span className="flex-1">{point}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* Viewpoints Section */}
      <Section title="观点" icon="💡">
        <div className="space-y-3">
          {result.viewpoints.map((viewpoint, index) => (
            <div key={index} className="text-sm">
              <p className="font-medium text-gray-900 mb-1">{viewpoint.perspective}</p>
              <p className="text-gray-700 pl-3 border-l-2 border-blue-200">{viewpoint.stance}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Best Practices Section */}
      <Section 
        title="最佳实践" 
        icon="✅" 
        defaultOpen={hasBestPractices}
        isEmpty={!hasBestPractices}
      >
        {hasBestPractices ? (
          <ul className="space-y-2">
            {result.bestPractices.map((practice, index) => (
              <li key={index} className="flex gap-2 text-sm">
                <span className="text-green-600 font-bold mt-0.5">✓</span>
                <span className="flex-1">{practice}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm">该文章未包含最佳实践内容</p>
        )}
      </Section>
    </div>
  );
}
