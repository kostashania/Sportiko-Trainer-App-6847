import * as React from "react"

// Table component
export const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={`w-full caption-bottom text-sm ${className}`}
      {...props}
    />
  </div>
))
Table.displayName = "Table"

// TableHeader component
export const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={`bg-gray-50 ${className}`} {...props} />
))
TableHeader.displayName = "TableHeader"

// TableBody component
export const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={`divide-y divide-gray-200 ${className}`}
    {...props}
  />
))
TableBody.displayName = "TableBody"

// TableFooter component
export const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={`border-t bg-gray-50 font-medium ${className}`}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

// TableRow component
export const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={`border-b transition-colors hover:bg-gray-50 data-[state=selected]:bg-gray-100 ${className}`}
    {...props}
  />
))
TableRow.displayName = "TableRow"

// TableHead component
export const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${className}`}
    {...props}
  />
))
TableHead.displayName = "TableHead"

// TableCell component
export const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={`px-6 py-4 whitespace-nowrap ${className}`}
    {...props}
  />
))
TableCell.displayName = "TableCell"

// TableCaption component
export const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={`mt-4 text-sm text-gray-500 ${className}`}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"