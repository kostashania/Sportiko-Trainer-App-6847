import * as React from "react"

// Simplified dropdown menu components
export const DropdownMenu = ({ children }) => {
  return (
    <div className="relative inline-block text-left">
      {children}
    </div>
  )
}

export const DropdownMenuTrigger = ({ asChild, children, ...props }) => {
  return React.cloneElement(children, {
    ...props,
    onClick: (e) => {
      e.stopPropagation()
      props.onClick?.(e)
      document.getElementById('dropdown-content')?.classList.toggle('hidden')
    },
  })
}

export const DropdownMenuContent = ({ children, align = "end", ...props }) => {
  const alignClass = align === "end" ? "right-0" : "left-0"
  
  React.useEffect(() => {
    const handleOutsideClick = (e) => {
      const dropdown = document.getElementById('dropdown-content')
      if (dropdown && !dropdown.contains(e.target) && !e.target.closest('.dropdown-trigger')) {
        dropdown.classList.add('hidden')
      }
    }
    
    document.addEventListener('click', handleOutsideClick)
    return () => document.removeEventListener('click', handleOutsideClick)
  }, [])
  
  return (
    <div 
      id="dropdown-content"
      className={`absolute z-10 mt-2 w-56 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none hidden ${alignClass}`}
      {...props}
    >
      <div className="py-1">
        {children}
      </div>
    </div>
  )
}

export const DropdownMenuItem = ({ children, className, onClick, disabled, ...props }) => {
  return (
    <button
      className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      onClick={(e) => {
        if (disabled) return
        onClick?.(e)
        document.getElementById('dropdown-content')?.classList.add('hidden')
      }}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}