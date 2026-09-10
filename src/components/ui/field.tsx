import { useMemo, type ComponentProps, type ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from 'cn'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

function FieldSet({ className, ...props }: ComponentProps<'fieldset'>) {
  return <fieldset data-slot="field-set" className={cn('flex flex-col gap-4', className)} {...props} />
}

function FieldLegend({ className, variant = 'legend', ...props }: ComponentProps<'legend'> & { variant?: 'legend' | 'label' }) {
  return <legend data-slot="field-legend" data-variant={variant} className={cn('text-sm font-medium', className)} {...props} />
}

function FieldGroup({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="field-group" className={cn('flex w-full flex-col gap-5', className)} {...props} />
}

const fieldVariants = cva('group/field flex w-full gap-2', {
  variants: {
    orientation: {
      vertical: 'flex-col',
      horizontal: 'flex-row items-center',
      responsive: 'flex-col sm:flex-row sm:items-center',
    },
  },
  defaultVariants: { orientation: 'vertical' },
})

function Field({ className, orientation = 'vertical', ...props }: ComponentProps<'div'> & VariantProps<typeof fieldVariants>) {
  return <div role="group" data-slot="field" data-orientation={orientation} className={cn(fieldVariants({ orientation }), className)} {...props} />
}

function FieldContent({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="field-content" className={cn('flex flex-1 flex-col gap-1', className)} {...props} />
}

function FieldLabel({ className, ...props }: ComponentProps<typeof Label>) {
  return <Label data-slot="field-label" className={cn('flex w-fit items-center gap-2 text-[12px] leading-normal font-medium', className)} {...props} />
}

function FieldTitle({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="field-label" className={cn('text-sm font-medium', className)} {...props} />
}

function FieldDescription({ className, ...props }: ComponentProps<'p'>) {
  return <p data-slot="field-description" className={cn('text-[11px] leading-relaxed text-muted-foreground [&>a]:underline [&>a]:underline-offset-4', className)} {...props} />
}

function FieldSeparator({ children, className, ...props }: ComponentProps<'div'> & { children?: ReactNode }) {
  return <div data-slot="field-separator" className={cn('flex items-center gap-2', className)} {...props}><Separator />{children && <span className="shrink-0 text-sm text-muted-foreground">{children}</span>}</div>
}

function FieldError({ className, children, errors, ...props }: ComponentProps<'div'> & { errors?: Array<{ message?: string } | undefined> }) {
  const content = useMemo(() => {
    if (children) return children
    const messages = [...new Set(errors?.map((error) => error?.message).filter(Boolean))]
    if (messages.length === 0) return null
    return messages.length === 1 ? messages[0] : <ul>{messages.map((message) => <li key={message}>{message}</li>)}</ul>
  }, [children, errors])
  if (!content) return null
  return <div role="alert" data-slot="field-error" className={cn('text-sm text-foreground', className)} {...props}>{content}</div>
}

export { Field, FieldLabel, FieldDescription, FieldError, FieldGroup, FieldLegend, FieldSeparator, FieldSet, FieldContent, FieldTitle }
