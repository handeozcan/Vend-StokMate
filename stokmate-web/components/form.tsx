import type { ComponentPropsWithRef } from 'react';

// ComponentPropsWithRef includes `ref` — react-hook-form's register()/Controller
// field objects carry a ref, and the stock dialog passes one explicitly. The
// ref flows through the prop spread into the native element (React 19).
const inputBase =
  'block w-full rounded-lg border bg-surface px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:ring-2 disabled:bg-zinc-50 disabled:text-zinc-400';

const inputTone = (error?: string) =>
  error
    ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
    : 'border-zinc-300 focus:border-teal-600 focus:ring-teal-600/20';

export function Field({
  label,
  error,
  ...inputProps
}: ComponentPropsWithRef<'input'> & { label: string; error?: string }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-zinc-700" htmlFor={inputProps.id}>
        {label}
      </label>
      <input className={`${inputBase} ${inputTone(error)}`} {...inputProps} />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function SelectField({
  label,
  error,
  ...selectProps
}: ComponentPropsWithRef<'select'> & { label: string; error?: string }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-zinc-700" htmlFor={selectProps.id}>
        {label}
      </label>
      <select className={`${inputBase} ${inputTone(error)}`} {...selectProps}>
        {selectProps.children}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
