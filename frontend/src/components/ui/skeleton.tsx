import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('k-skeleton animate-pulse rounded-md bg-muted', className)} {...props} />
}

export { Skeleton }
