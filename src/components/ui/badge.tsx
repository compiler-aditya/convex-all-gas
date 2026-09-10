import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from 'cn'

const badgeVariants = cva('inline-flex w-fit shrink-0 items-center justify-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-medium whitespace-nowrap [&>svg]:size-4', {
  variants: {
    variant: {
      default: 'border-transparent bg-accent text-accent-foreground',
      secondary: 'border-border bg-background text-muted-foreground',
      destructive: 'border-foreground bg-background text-foreground',
      outline: 'border-border bg-transparent text-foreground',
      ghost: 'border-transparent text-muted-foreground',
      link: 'border-transparent text-foreground underline underline-offset-4',
    },
  },
  defaultVariants: { variant: 'default' },
})

function Badge({ className, variant = 'default', render, ...props }: useRender.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: 'span',
    props: mergeProps<'span'>({ className: cn(badgeVariants({ variant }), className) }, props),
    render,
    state: { slot: 'badge', variant },
  })
}

export { Badge, badgeVariants }
