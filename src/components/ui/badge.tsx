import * as React from "react"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success'
}

function Badge({
  className,
  variant = 'default',
  ...props
}: BadgeProps) {
  // Base styles
  const baseClasses = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
  
  // Variant styles
  let variantClasses = ''
  
  switch (variant) {
    case 'default':
      variantClasses = "bg-blue-100 text-blue-800"
      break
    case 'secondary':
      variantClasses = "bg-gray-100 text-gray-800"
      break
    case 'destructive':
      variantClasses = "bg-red-100 text-red-800"
      break
    case 'outline':
      variantClasses = "border border-gray-200 text-gray-800"
      break
    case 'success':
      variantClasses = "bg-green-100 text-green-800"
      break
  }
  
  return (
    <div className={`${baseClasses} ${variantClasses} ${className}`} {...props} />
  )
}

export { Badge }