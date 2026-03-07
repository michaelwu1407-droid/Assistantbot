import { cn } from "@/lib/utils"

interface TraceyAvatarProps {
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = {
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-base',
}

export function TraceyAvatar({ size = 'md' }: TraceyAvatarProps) {
  return (
    <div className={cn(
      'rounded-full bg-gradient-to-br from-primary to-primary-hover',
      'flex items-center justify-center font-semibold text-white flex-shrink-0',
      sizeMap[size]
    )}>
      T
    </div>
  )
}
