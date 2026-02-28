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
      text-slate-700 placeholder:text-slate-400
      bg-white border rounded-lg
      transition-colors
      focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-0 focus:border-blue-600
      ${error ? 'border-red-500' : 'border-slate-200'}
      ${icon ? 'pl-9' : ''}
      ${className}
    `;

    return (
      <div>
        {label && (
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
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
          <p className="text-sm text-red-500 mt-1">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
