import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from 'cn'

const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border text-sm font-medium whitespace-nowrap select-none transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:border-border disabled:bg-muted disabled:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'border-primary bg-primary text-primary-foreground hover:bg-primary/90',
        outline: 'border-border bg-background text-foreground hover:bg-muted',
        secondary: 'border-border bg-secondary text-secondary-foreground hover:border-foreground',
        ghost: 'border-transparent bg-transparent text-muted-foreground hover:text-foreground disabled:border-transparent disabled:bg-transparent',
        destructive: 'border-foreground bg-background text-foreground hover:bg-muted',
        link: 'border-transparent bg-transparent text-foreground underline underline-offset-4 disabled:border-transparent disabled:bg-transparent',
      },
      size: {
        default: 'h-10 px-4',
        xs: 'h-8 px-2',
        sm: 'h-9 px-3',
        lg: 'h-12 px-5',
        icon: 'size-10',
        'icon-xs': 'size-8',
        'icon-sm': 'size-9',
        'icon-lg': 'size-12',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

function Button({ className, variant = 'default', size = 'default', ...props }: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return <ButtonPrimitive data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />
}

export { Button, buttonVariants }
