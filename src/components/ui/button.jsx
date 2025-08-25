import React from 'react'

export function Button({ children, className = '', variant = 'default', size = 'default', ...props }) {
  const base = 'inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-medium shadow-sm transition active:scale-[.98] focus:outline-none focus:ring';
  const variants = {
    default: 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
    ghost: 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
  };
  const sizes = {
    default: '',
    icon: 'p-2'
  };
  const cls = [base, variants[variant] || variants.default, sizes[size] || '', className].join(' ');
  return <button className={cls} {...props}>{children}</button>;
}

export default Button
