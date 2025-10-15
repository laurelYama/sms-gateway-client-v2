"use client"

import * as React from "react"
import { DayPicker } from "react-day-picker"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-2 text-xs", className)}
      classNames={{
        months: "space-y-2",
        month: "space-y-2",
        caption: "relative flex items-center justify-center pt-0 pb-2",
        caption_label: "text-xs font-medium",
        nav: "flex items-center space-x-1",
        nav_button: cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "h-6 w-6 p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full",
        head_row: "grid grid-cols-7 mb-1",
        head_cell: "text-muted-foreground h-6 flex items-center justify-center text-[0.6rem] font-medium",
        row: "grid grid-cols-7",
        cell: "h-6 relative text-center p-0 text-[0.8rem]",
        day: cn(
          "h-6 w-6 p-0 font-normal rounded-sm hover:bg-accent hover:text-accent-foreground",
          "aria-selected:bg-primary aria-selected:text-primary-foreground"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
