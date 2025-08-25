import React from 'react'
export function Card({ className='', children }) {
  return <div className={'rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 '+className}>{children}</div>
}
export function CardHeader({ children, className='' }) {
  return <div className={'p-4 border-b border-slate-200/70 dark:border-slate-800/70 '+className}>{children}</div>
}
export function CardTitle({ children, className='' }) {
  return <h3 className={'text-lg font-semibold '+className}>{children}</h3>
}
export function CardDescription({ children, className='' }) {
  return <p className={'text-sm text-slate-500 dark:text-slate-400 '+className}>{children}</p>
}
export function CardContent({ children, className='' }) {
  return <div className={'p-4 '+className}>{children}</div>
}
