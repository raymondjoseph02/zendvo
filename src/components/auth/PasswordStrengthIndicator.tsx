import React from 'react';

interface PasswordStrengthIndicatorProps {
  strength: 0 | 1 | 2 | 3 | 4; // 0: empty, 1: weak, 2: fair, 3: good, 4: strong
}

const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({ strength }) => {
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = [
    'bg-gray-200',
    'bg-red-500',
    'bg-yellow-500',
    'bg-blue-500',
    'bg-green-500',
  ];

  return (
    <div className="space-y-2 mt-2">
      <div className="flex gap-1 h-1.5">
        {[1, 2, 3, 4].map((index) => (
          <div
            key={index}
            className={`flex-1 rounded-full transition-colors duration-300 ${
              index <= strength ? colors[strength] : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      {strength > 0 && (
        <p className={`text-xs font-medium ${strength === 1 ? 'text-red-500' : strength === 2 ? 'text-yellow-600' : strength === 3 ? 'text-blue-600' : 'text-green-600'}`}>
          {labels[strength]}
        </p>
      )}
    </div>
  );
};

export default PasswordStrengthIndicator;
