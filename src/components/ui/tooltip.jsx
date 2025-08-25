import React from 'react'
export function TooltipProvider({ children }) { return <>{children}</>; }
export function Tooltip({ children }) { return <>{children}</>; }
export function TooltipTrigger({ asChild=false, children, ...props }) {
  return React.cloneElement(children, { ...props })
}
export function TooltipContent({ children }) {
  // Non-functional visual tooltip stub; could be enhanced
  return null
}
