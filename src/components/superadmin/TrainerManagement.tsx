import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '../../components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  SortingState,
  getSortedRowModel,
  ColumnFiltersState,
  getFilteredRowModel,
} from '@tanstack/react-table'
import { format } from 'date-fns'
import { MoreHorizontal, Search, Plus, Loader2, Calendar } from 'lucide-react'
import { toast } from 'react-hot-toast'

type Trainer = {
  id: string
  email: string
  full_name: string
  is_active: boolean
  trial_end: string
  created_at: string
}

export default function TrainerManagement() {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [data, setData] = useState<Trainer[]>([])
  const queryClient = useQueryClient()

  // Fetch trainers
  const { isLoading } = useQuery({
    queryKey: ['trainers'],
    queryFn: async () => {
      console.log('📋 Fetching trainers...')
      
      // Log the current table being used
      console.log('🔍 Using table: public.trainers')
      
      const { data, error } = await supabase
        .from('trainers')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Error fetching trainers:', error)
        throw error
      }

      console.log('✅ Fetched trainers:', data?.length || 0)
      console.log('📊 Sample trainer data:', data?.[0])
      setData(data || [])
      return data
    },
  })

  // Delete trainer mutation with enhanced logging
  const deleteTrainer = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      console.log('🗑️ Deleting trainer:', id)
      
      // Show loading toast
      toast.loading('Deleting trainer...', { id: 'delete-trainer' })
      
      // Log the table being used for deletion
      console.log('🔍 Deleting from table: public.trainers')
      
      // Check if trainer exists before deletion
      console.log('🔍 Checking if trainer exists before deletion...')
      const { data: checkData, error: checkError } = await supabase
        .from('trainers')
        .select('id, email')
        .eq('id', id)
        .single()
        
      if (checkError) {
        console.error('❌ Error checking trainer existence:', checkError)
        throw new Error(`Failed to verify trainer: ${checkError.message}`)
      }
      
      console.log('✅ Trainer found before deletion:', checkData)
      
      // Send DELETE request to Supabase
      console.log('📡 Sending DELETE request to Supabase...')
      const { data, error, status, statusText } = await supabase
        .from('trainers')
        .delete()
        .eq('id', id)
      
      // Log complete response details
      console.log('📡 DELETE Response:', { 
        status,
        statusText,
        data, 
        error,
        success: !error,
        timestamp: new Date().toISOString()
      })
      
      if (error) {
        console.error('❌ Delete failed:', error)
        throw new Error(`Failed to delete trainer: ${error.message}`)
      }
      
      // Verify deletion by checking if trainer still exists
      console.log('🔍 Verifying deletion by checking if trainer still exists...')
      const { data: verifyData, error: verifyError } = await supabase
        .from('trainers')
        .select('id')
        .eq('id', id)
        .single()
        
      if (verifyError && verifyError.code === 'PGRST116') {
        console.log('✅ Verification confirms trainer was deleted')
      } else if (verifyData) {
        console.error('❌ Verification failed: Trainer still exists after deletion', verifyData)
        throw new Error('Trainer still exists after deletion attempt')
      }
      
      console.log('✅ Delete successful')
      return id
    },
    onSuccess: (deletedId) => {
      // Only update UI after successful database deletion
      console.log('🔄 Updating UI after deletion:', deletedId)
      setData((prevData) => {
        const newData = prevData.filter((trainer) => trainer.id !== deletedId)
        console.log(`📊 UI updated: ${prevData.length} → ${newData.length} trainers`)
        return newData
      })
      toast.success('Trainer deleted successfully', { id: 'delete-trainer' })
      
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['trainers'] })
    },
    onError: (error: Error) => {
      console.error('❌ Delete error:', error)
      toast.error(`Deletion failed: ${error.message}`, { id: 'delete-trainer' })
    }
  })

  // Toggle trainer status with enhanced logging
  const toggleTrainerStatus = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: boolean }) => {
      console.log(`🔄 Toggling trainer status for ${id}:`, { currentStatus, newStatus: !currentStatus })
      
      toast.loading('Updating trainer status...', { id: 'toggle-status' })
      
      // Log the table being used for update
      console.log('🔍 Updating table: public.trainers')
      
      const { data, error, status, statusText } = await supabase
        .from('trainers')
        .update({ is_active: !currentStatus })
        .eq('id', id)
        .select()
      
      // Log complete response
      console.log('📡 Toggle status response:', { 
        status,
        statusText,
        data, 
        error,
        success: !error,
        timestamp: new Date().toISOString()
      })
      
      if (error) {
        console.error('❌ Toggle status failed:', error)
        throw error
      }
      
      console.log('✅ Toggle status successful, updated data:', data)
      return { id, newStatus: !currentStatus }
    },
    onSuccess: ({ id, newStatus }) => {
      console.log(`🔄 Updating UI: trainer ${id} status → ${newStatus}`)
      setData((prevData) =>
        prevData.map((trainer) =>
          trainer.id === id ? { ...trainer, is_active: newStatus } : trainer
        )
      )
      toast.success(`Trainer ${newStatus ? 'activated' : 'deactivated'} successfully`, { id: 'toggle-status' })
      
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['trainers'] })
    },
    onError: (error) => {
      console.error('❌ Toggle status error:', error)
      toast.error(`Failed to update trainer status: ${error}`, { id: 'toggle-status' })
    },
  })
  
  // Extend trial mutation with enhanced logging
  const extendTrial = useMutation({
    mutationFn: async ({ id, currentTrialEnd }: { id: string; currentTrialEnd: string | null }) => {
      console.log(`📅 Extending trial for trainer ${id}`, { currentTrialEnd })
      
      toast.loading('Extending trial period...', { id: 'extend-trial' })
      
      // Log the table being used for update
      console.log('🔍 Updating table: public.trainers')
      
      // Calculate new trial end date (current + 14 days)
      const trialEnd = currentTrialEnd ? new Date(currentTrialEnd) : new Date()
      const newTrialEnd = new Date(trialEnd)
      newTrialEnd.setDate(newTrialEnd.getDate() + 14)
      
      console.log('Trial dates:', { 
        currentTrialEnd, 
        parsedCurrentEnd: currentTrialEnd ? new Date(currentTrialEnd).toISOString() : 'none',
        newTrialEnd: newTrialEnd.toISOString() 
      })
      
      // Update the trial end date
      const { data, error, status, statusText } = await supabase
        .from('trainers')
        .update({ trial_end: newTrialEnd.toISOString() })
        .eq('id', id)
        .select()
      
      // Log complete response
      console.log('📡 Extend trial response:', { 
        status,
        statusText,
        data, 
        error,
        success: !error,
        timestamp: new Date().toISOString()
      })
      
      if (error) {
        console.error('❌ Extend trial failed:', error)
        throw error
      }
      
      console.log('✅ Trial extended successfully, updated data:', data)
      return { id, newTrialEnd: newTrialEnd.toISOString() }
    },
    onSuccess: ({ id, newTrialEnd }) => {
      console.log(`🔄 Updating UI: trainer ${id} trial end → ${newTrialEnd}`)
      setData((prevData) =>
        prevData.map((trainer) =>
          trainer.id === id ? { ...trainer, trial_end: newTrialEnd } : trainer
        )
      )
      toast.success('Trial extended by 14 days', { id: 'extend-trial' })
      
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['trainers'] })
    },
    onError: (error) => {
      console.error('❌ Extend trial error:', error)
      toast.error(`Failed to extend trial: ${error}`, { id: 'extend-trial' })
    },
  })

  const columns: ColumnDef<Trainer>[] = [
    {
      accessorKey: 'full_name',
      header: 'Name',
    },
    {
      accessorKey: 'email',
      header: 'Email',
    },
    {
      accessorKey: 'trial_end',
      header: 'Trial Status',
      cell: ({ row }) => {
        const trialEnd = row.original.trial_end ? new Date(row.original.trial_end) : null
        const today = new Date()
        const isActive = trialEnd && trialEnd > today
        const daysLeft = trialEnd
          ? Math.ceil((trialEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          : 0

        return (
          <Badge variant={isActive ? 'success' : 'destructive'}>
            {isActive ? `${daysLeft} days left` : 'Expired'}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Joined',
      cell: ({ row }) => {
        return row.original.created_at
          ? format(new Date(row.original.created_at), 'MMM dd, yyyy')
          : 'N/A'
      },
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => {
        return (
          <Badge variant={row.original.is_active ? 'success' : 'destructive'}>
            {row.original.is_active ? 'Active' : 'Inactive'}
          </Badge>
        )
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const isProcessing = 
          toggleTrainerStatus.isPending && toggleTrainerStatus.variables?.id === row.original.id ||
          deleteTrainer.isPending && deleteTrainer.variables?.id === row.original.id ||
          extendTrial.isPending && extendTrial.variables?.id === row.original.id

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MoreHorizontal className="h-4 w-4" />
                )}
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  console.log('👆 Toggle status clicked for:', row.original.id)
                  toggleTrainerStatus.mutate({
                    id: row.original.id,
                    currentStatus: row.original.is_active,
                  })
                }}
                disabled={isProcessing}
              >
                {row.original.is_active ? 'Deactivate' : 'Activate'}
              </DropdownMenuItem>
              
              <DropdownMenuItem
                onClick={() => {
                  console.log('👆 Extend trial clicked for:', row.original.id)
                  extendTrial.mutate({
                    id: row.original.id,
                    currentTrialEnd: row.original.trial_end
                  })
                }}
                disabled={isProcessing}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Extend Trial
              </DropdownMenuItem>
              
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => {
                  console.log('👆 Delete clicked for:', row.original.id)
                  if (confirm('Are you sure you want to delete this trainer?')) {
                    deleteTrainer.mutate({ id: row.original.id })
                  }
                }}
                disabled={isProcessing}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">Trainer Management</h1>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Trainer
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Trainers</CardTitle>
          <div className="flex items-center">
            <Search className="h-4 w-4 mr-2 text-muted-foreground" />
            <Input
              placeholder="Filter trainers..."
              value={(table.getColumn('full_name')?.getFilterValue() as string) ?? ''}
              onChange={(e) => table.getColumn('full_name')?.setFilterValue(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && 'selected'}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No trainers found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-end space-x-2 py-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}