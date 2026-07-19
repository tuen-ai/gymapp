import { useState } from 'react'

const CDN_PREFIX = 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/'
const RAW_PREFIX = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/'

/** jsDelivr CDN 載入失敗時自動退去 GitHub raw */
export default function ExerciseImg({
  src,
  alt = '',
  className,
  loading = 'lazy',
}: {
  src: string | undefined
  alt?: string
  className?: string
  loading?: 'lazy' | 'eager'
}) {
  const [fallback, setFallback] = useState(false)
  if (!src) return <div className={className} />
  const url = fallback ? src.replace(CDN_PREFIX, RAW_PREFIX) : src
  return (
    <img
      src={url}
      alt={alt}
      loading={loading}
      className={className}
      onError={() => {
        if (!fallback) setFallback(true)
      }}
    />
  )
}
