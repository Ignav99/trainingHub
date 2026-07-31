'use client'

import Image from 'next/image'

interface TeamCrestProps {
  src?: string | null
  name: string
  size?: 'sm' | 'md' | 'lg'
}

const SIZES = { sm: 24, md: 32, lg: 48 }

export function TeamCrest({ src, name, size = 'md' }: TeamCrestProps) {
  const px = SIZES[size]
  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={px}
        height={px}
        className="rounded-md object-contain bg-white/80 border"
        unoptimized
      />
    )
  }
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
  return (
    <div
      className="rounded-md bg-muted flex items-center justify-center text-muted-foreground font-bold border"
      style={{ width: px, height: px, fontSize: px * 0.4 }}
    >
      {initials}
    </div>
  )
}
