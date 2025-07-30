import * as React from "react"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    // Base styles
    let variantClasses = ''
    let sizeClasses = ''
    
    // Variant styles
    switch (variant) {
      case 'default':
        variantClasses = 'bg-blue-600 text-white hover:bg-blue-700'
        break
      case 'destructive':
        variantClasses = 'bg-red-600 text-white hover:bg-red-700'
        break
      case 'outline':
        variantClasses = 'border border-gray-300 text-gray-700 hover:bg-gray-50'
        break
      case 'secondary':
        variantClasses = 'bg-gray-100 text-gray-900 hover:bg-gray-200'
        break
      case 'ghost':
        variantClasses = 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        break
      case 'link':
        variantClasses = 'text-blue-600 underline-offset-4 hover:underline'
        break
    }
    
    // Size styles
    switch (size) {
      case 'default':
        sizeClasses = 'h-10 px-4 py-2'
        break
      case 'sm':
        sizeClasses = 'h-8 px-3 text-sm'
        break
      case 'lg':
        sizeClasses = 'h-12 px-6'
        break
      case 'icon':
        sizeClasses = 'h-10 w-10'
        break
    }
    
    const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none disabled:opacity-50 disabled:pointer-events-none'
    
    return (
      <button
        className={`${baseClasses} ${variantClasses} ${sizeClasses} ${className}`}
        ref={ref}
        {...props}
      />
    )
  }
)

Button.displayName = "Button"

export { Button }