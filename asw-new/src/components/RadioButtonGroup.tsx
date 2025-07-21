import React from 'react';

interface RadioOption {
  id: string;
  value: string;
  label: string;
}

interface RadioButtonGroupProps {
  name: string;
  options: RadioOption[];
  selectedValue: string;
  onChange: (value: string) => void;
  className?: string;
}

export const RadioButtonGroup: React.FC<RadioButtonGroupProps> = React.memo(({
  name,
  options,
  selectedValue,
  onChange,
  className = ''
}) => {
  return (
    <div className={`radio-group ${className}`}>
      {options.map((option) => (
        <div key={option.id} className="radio-option">
          <input
            type="radio"
            id={option.id}
            name={name}
            value={option.value}
            checked={selectedValue === option.value}
            onChange={() => onChange(option.value)}
          />
          <label htmlFor={option.id}>{option.label}</label>
        </div>
      ))}
    </div>
  );
});
