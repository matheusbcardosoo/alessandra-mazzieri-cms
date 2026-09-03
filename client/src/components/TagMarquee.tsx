import { Icon } from './Icon';

const TAGS: { label: string; icon: string }[] = [
  { label: 'Clareza Emocional', icon: 'circle-outline' },
  { label: 'Autonomia Psíquica', icon: 'plus' },
  { label: 'Individuação', icon: 'eye' },
  { label: 'Acolhimento', icon: 'heart' },
  { label: 'Símbolos da Alma', icon: 'spa' },
  { label: 'Confiança', icon: 'check' },
  { label: 'Transformação', icon: 'sun' },
  { label: 'Autoconhecimento', icon: 'star' }
];

// Marquee decorativo exclusivo deste site (não faz parte do sistema de blocos).
// Lista triplicada (não duplicada) para o loop de -33.3333% ficar perfeitamente
// contínuo, igual à referência.
export function TagMarquee() {
  return (
    <div className="tag-marquee" aria-hidden="true">
      <div className="tag-marquee-track">
        {[...TAGS, ...TAGS, ...TAGS].map((tag, index) => (
          <span className="tag-marquee-item" key={`${tag.label}-${index}`}>
            <Icon name={tag.icon} />
            {tag.label}
          </span>
        ))}
      </div>
    </div>
  );
}
