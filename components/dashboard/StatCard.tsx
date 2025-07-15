import { Card } from '@/components/ui/Card'
import { ReactNode } from 'react'

interface StatCardProps {
  title: string
  value: string | ReactNode
  subtitle?: string
  className?: string
}

export function StatCard({ title, value, subtitle, className = '' }: StatCardProps) {
  return (
    <Card className={className}>
      <h3 className="font-sans text-heading-lg mb-2 text-text-primary">{title}</h3>
      <div className="text-display-md font-light text-text-primary">{value}</div>
      {subtitle && (
        <p className="text-caption text-text-secondary mt-1">{subtitle}</p>
      )}
    </Card>
  )
}