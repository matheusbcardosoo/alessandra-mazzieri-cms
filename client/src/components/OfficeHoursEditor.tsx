import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import type { OfficeHour } from '@/types/content';

type OfficeHoursEditorProps = {
  value: OfficeHour[];
  onChange: (hours: OfficeHour[]) => void;
  onAdd?: () => void;
};

export function OfficeHoursEditor({ value, onChange }: OfficeHoursEditorProps) {
  const handleUpdate = (index: number, field: keyof OfficeHour, newValue: string) => {
    const updated = [...value];
    updated[index] = { ...updated[index], [field]: newValue };
    onChange(updated);
  };

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="office-hours-editor">
      {value.map((item, index) => (
        <div key={index} className="office-hours-row">
          <input
            type="text"
            placeholder="ex: Seg–Sex"
            value={item.label}
            onChange={(e) => handleUpdate(index, 'label', e.target.value)}
            className="form-input office-hours-label-input"
            aria-label="Dia ou período"
          />
          <input
            type="text"
            placeholder="ex: 9h às 18h"
            value={item.hours}
            onChange={(e) => handleUpdate(index, 'hours', e.target.value)}
            className="form-input"
            aria-label="Horário"
          />
          <button
            type="button"
            onClick={() => handleRemove(index)}
            className="btn btn-icon tone-danger"
            title="Remover horário"
            aria-label="Remover horário"
          >
            <FontAwesomeIcon icon={faTrash} />
          </button>
        </div>
      ))}

      {value.length === 0 && (
        <p className="office-hours-empty">Nenhum horário cadastrado.</p>
      )}
    </div>
  );
}
