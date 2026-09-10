import { Tabs as TabsPrimitive } from '@base-ui/react/tabs'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from 'cn'

function Tabs({ className, orientation = 'horizontal', ...props }: TabsPrimitive.Root.Props) {
  return <TabsPrimitive.Root data-slot="tabs" orientation={orientation} className={cn('flex flex-col', className)} {...props} />
}

const tabsListVariants = cva('flex w-full items-stretch text-muted-foreground sm:w-fit', {
  variants: {
    variant: {
      default: 'rounded-sm border border-border',
      line: 'bg-transparent',
    },
  },
  defaultVariants: { variant: 'default' },
})

function TabsList({ className, variant = 'default', ...props }: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return <TabsPrimitive.List data-slot="tabs-list" data-variant={variant} className={cn(tabsListVariants({ variant }), className)} {...props} />
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn('min-h-12 min-w-0 flex-1 border-b border-transparent px-3 text-[12px] whitespace-nowrap text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 data-active:border-foreground data-active:text-foreground disabled:cursor-not-allowed sm:flex-none sm:px-4', className)}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return <TabsPrimitive.Panel data-slot="tabs-content" className={cn('min-w-0 flex-1 text-sm [[hidden]]:hidden', className)} {...props} />
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
