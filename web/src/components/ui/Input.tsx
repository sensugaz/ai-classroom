'use client';

import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from 'react';

interface InputBaseProps {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

type InputProps = InputBaseProps &
  InputHTMLAttributes<HTMLInputElement> & {
    multiline?: false;
  };

type TextareaProps = InputBaseProps &
  TextareaHTMLAttributes<HTMLTextAreaElement> & {
    multiline: true;
  };

type CombinedProps = InputProps | TextareaProps;

const Input = forwardRef<HTMLInputElement | HTMLTextAreaElement, CombinedProps>(
  (props, ref) => {
    const { label, error, icon, className = '', multiline, ...rest } = props;

    const baseClasses = `
      w-full h-10 px-3 text-sm
      bg-white/5 border rounded-lg
      text-slate-100 placeholder:text-slate-600
      transition-all duration-200
      focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 focus:bg-white/[0.07]
      ${error ? 'border-rose-500/50' : 'border-white/10'}
      ${icon ? 'pl-9' : ''}
      ${className}
    `;

    return (
      <div>
        {label && (
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
              {icon}
            </span>
          )}
          {multiline ? (
            <textarea
              ref={ref as React.Ref<HTMLTextAreaElement>}
              className={`${baseClasses} min-h-[80px] h-auto py-2 resize-y`}
              {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
            />
          ) : (
            <input
              ref={ref as React.Ref<HTMLInputElement>}
              className={baseClasses}
              {...(rest as InputHTMLAttributes<HTMLInputElement>)}
            />
          )}
        </div>
        {error && (
          <p className="text-sm text-rose-400 mt-1">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
