'use client';

import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';

interface InputBaseProps {
  label?: string;
  error?: string;
  icon?: string;
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
      w-full px-5 py-4
      text-lg font-nunito text-slate-700 placeholder:text-slate-400
      bg-white border-2 rounded-2xl
      transition-all duration-200
      focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400
      ${error ? 'border-pink-300 focus:ring-pink-100 focus:border-pink-400' : 'border-slate-200 hover:border-indigo-300'}
      ${icon ? 'pl-12' : ''}
      ${className}
    `;

    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-base font-bold font-nunito text-slate-600">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">
              {icon}
            </span>
          )}
          {multiline ? (
            <textarea
              ref={ref as React.Ref<HTMLTextAreaElement>}
              className={`${baseClasses} min-h-[120px] resize-y`}
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
          <p className="text-sm font-medium text-pink-500 pl-1">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
