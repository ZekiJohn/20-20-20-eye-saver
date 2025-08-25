import React from 'react'
export function Switch({ checked=false, onCheckedChange }) {
  return (
    <button
      onClick={() => onCheckedChange?.(!checked)}
      className={(checked ? 'bg-slate-900 dark:bg-slate-100' : 'bg-slate-300 dark:bg-slate-700') + ' relative inline-flex h-6 w-10 items-center rounded-full transition'}
      aria-pressed={checked}
      role='switch'
    >
      <span
        className={'inline-block h-5 w-5 transform rounded-full bg-white dark:bg-slate-900 transition ' + (checked ? 'translate-x-5' : 'translate-x-1')}
      />
    </button>
  )
}
