'use client';

import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export const PasswordInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function PasswordInput({ className = '', ...props }, ref) {
    const [visible, setVisible] = useState(false);

    return (
      <div className="relative">
        <input {...props} ref={ref} type={visible ? 'text' : 'password'} className={`${className} pr-10`} />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          tabIndex={-1}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-foreground-muted hover:text-ink"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    );
  },
);
