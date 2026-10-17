import { forwardRef } from "react"
import { cn } from "../../lib/utils"

const Input = forwardRef(({ className, type, id, name, ...props }, ref) => {
  const fallbackId = id || name || (props["aria-label"] ? `input-${props["aria-label"].toLowerCase().replace(/[^a-z0-9]/g, "-")}` : (props.placeholder ? `input-${props.placeholder.toLowerCase().slice(0, 20).replace(/[^a-z0-9]/g, "-")}` : undefined));
  return (
    <input
      type={type}
      id={fallbackId}
      name={name || fallbackId}
      className={cn(
        "flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = "Input"

export { Input }
export default Input
