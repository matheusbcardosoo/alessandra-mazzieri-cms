import { useState } from 'react';
import type { BlockRendererProps } from '../_shared/types';
import type { FaqBlockData } from './schema';

export function FaqRenderer({ data }: BlockRendererProps<FaqBlockData>) {
  const [openId, setOpenId] = useState<string | null>(
    typeof data.defaultOpenIndex === 'number' ? data.items[data.defaultOpenIndex]?.id ?? null : null
  );

  if (!data.items?.length) return null;

  return (
    <div className="page-public-faq">
      {data.title && <h2 className="faq-title">{data.title}</h2>}
      {data.subtitle && <p className="faq-subtitle">{data.subtitle}</p>}
      <div className="faq-list">
        {data.items.map((item) => {
          const isOpen = openId === item.id;
          return (
            <div key={item.id} className={`faq-item ${isOpen ? 'is-open' : ''}`.trim()}>
              <button
                type="button"
                className="faq-question"
                aria-expanded={isOpen}
                onClick={() => setOpenId(isOpen ? null : item.id)}
              >
                <span>{item.question}</span>
                <span className="faq-plus" aria-hidden="true" />
              </button>
              <div className="faq-answer-wrap">
                <div className="faq-answer-inner">
                  <p className="faq-answer">{item.answer}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
