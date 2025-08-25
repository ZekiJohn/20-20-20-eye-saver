import React from 'react'
export function Input(props) {
  const cls = 'w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:ring focus:ring-slate-200 dark:focus:ring-slate-800';
  return <input {...props} className={(props.className||'') + ' ' + cls} />
}
