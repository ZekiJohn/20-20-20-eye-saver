import React, { createContext, useContext } from 'react'

const Ctx = createContext({ items: [], value: '', onValueChange: () => {} })

export function Select({ value, onValueChange, children }) {
  // Extract items from <SelectContent><SelectItem/></SelectContent>
  const items = []
  React.Children.forEach(children, (child) => {
    if (!child) return
    if (child.type && (child.type.displayName === 'SelectContent' || child.type.name === 'SelectContent')) {
      React.Children.forEach(child.props.children, (item) => {
        if (!item) return
        if (item.type && (item.type.displayName === 'SelectItem' || item.type.name === 'SelectItem')) {
          items.push({ value: item.props.value, label: flattenText(item.props.children) })
        }
      })
    }
  })
  return (
    <div className='relative inline-block'>
      <select
        className='border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-900'
        value={value}
        onChange={(e) => onValueChange?.(e.target.value)}
      >
        {items.map((it) => (
          <option key={it.value} value={it.value}>{it.label || it.value}</option>
        ))}
      </select>
    </div>
  )
}

export function SelectTrigger({ children, className }) { return <div className={className}>{children}</div> }
export function SelectValue() { return null }
export function SelectContent({ children }) { return <>{children}</> }
export function SelectItem({ children }) { return <>{children}</> }

function flattenText(children) {
  const acc = []
  const walk = (c) => {
    if (c == null) return
    if (typeof c === 'string' || typeof c === 'number') { acc.push(String(c)) }
    else if (Array.isArray(c)) c.forEach(walk)
    else if (c.props && c.props.children) walk(c.props.children)
  }
  walk(children)
  return acc.join(' ').trim()
}

Select.displayName = 'Select'
SelectContent.displayName = 'SelectContent'
SelectItem.displayName = 'SelectItem'
SelectTrigger.displayName = 'SelectTrigger'
SelectValue.displayName = 'SelectValue'
