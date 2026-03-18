import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/src/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-[13px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4361EE]/30 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer select-none active:scale-[0.97]",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-[#4361EE] to-[#3a56d4] text-white shadow-[0_2px_8px_rgba(67,97,238,0.35)] hover:shadow-[0_4px_16px_rgba(67,97,238,0.45)] hover:from-[#3a56d4] hover:to-[#2d46b8]",
        destructive:
          "bg-gradient-to-r from-[#EF4444] to-[#DC2626] text-white shadow-[0_2px_8px_rgba(239,68,68,0.3)] hover:shadow-[0_4px_16px_rgba(239,68,68,0.4)] hover:from-[#DC2626] hover:to-[#B91C1C]",
        outline:
          "border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900",
        secondary:
          "bg-[#f0f4ff] text-[#4361EE] border border-[#4361EE]/10 hover:bg-[#e4ebff] hover:border-[#4361EE]/20",
        ghost:
          "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
        link:
          "text-[#4361EE] underline-offset-4 hover:underline p-0 h-auto",
        success:
          "bg-gradient-to-r from-[#10B981] to-[#059669] text-white shadow-[0_2px_8px_rgba(16,185,129,0.3)] hover:shadow-[0_4px_16px_rgba(16,185,129,0.4)] hover:from-[#059669] hover:to-[#047857]",
        warning:
          "bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white shadow-[0_2px_8px_rgba(245,158,11,0.3)] hover:shadow-[0_4px_16px_rgba(245,158,11,0.4)] hover:from-[#D97706] hover:to-[#B45309]",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 rounded-lg px-3.5 text-[12px]",
        lg: "h-11 rounded-xl px-8 text-[14px]",
        icon: "h-9 w-9 rounded-lg",
        xs: "h-7 rounded-lg px-2.5 text-[11px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
