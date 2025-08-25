import React from 'react'
export function Progress({ value=0, className='' }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={'w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden '+className}>
      <div className='h-full bg-slate-900 dark:bg-slate-100' style={{ width: v+'%' }} />
    </div>
  )
}
