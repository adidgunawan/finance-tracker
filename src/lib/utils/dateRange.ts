import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subWeeks, subMonths, subYears } from "date-fns";

export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Get start and end dates for a week containing the given date
 */
export function getWeekRange(date: Date = new Date()): DateRange {
  return {
    start: startOfWeek(date, { weekStartsOn: 1 }), // Monday
    end: endOfWeek(date, { weekStartsOn: 1 }),
  };
}

/**
 * Get start and end dates for a month containing the given date
 */
export function getMonthRange(date: Date = new Date()): DateRange {
  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
  };
}

/**
 * Get start and end dates for a year containing the given date
 */
export function getYearRange(date: Date = new Date()): DateRange {
  return {
    start: startOfYear(date),
    end: endOfYear(date),
  };
}

/**
 * Get date range for previous period
 */
export function getPreviousPeriodRange(
  period: "week" | "month" | "year",
  date: Date = new Date()
): DateRange {
  switch (period) {
    case "week":
      return getWeekRange(subWeeks(date, 1));
    case "month":
      return getMonthRange(subMonths(date, 1));
    case "year":
      return getYearRange(subYears(date, 1));
  }
}

/**
 * Format date range for display
 */
export function formatDateRange(range: DateRange, formatStr: string = "MMM d, yyyy"): string {
  return `${format(range.start, formatStr)} - ${format(range.end, formatStr)}`;
}

/**
 * Get ISO date strings for date range
 */
export function getDateRangeISO(range: DateRange): { start: string; end: string } {
  return {
    start: range.start.toISOString().split("T")[0],
    end: range.end.toISOString().split("T")[0],
  };
}

/**
 * Get all weeks in a date range
 */
export function getWeeksInRange(start: Date, end: Date): DateRange[] {
  const weeks: DateRange[] = [];
  let current = startOfWeek(start, { weekStartsOn: 1 });
  
  while (current <= end) {
    const weekEnd = endOfWeek(current, { weekStartsOn: 1 });
    weeks.push({
      start: current,
      end: weekEnd > end ? end : weekEnd,
    });
    current = new Date(weekEnd);
    current.setDate(current.getDate() + 1);
  }
  
  return weeks;
}

/**
 * Get all months in a date range
 */
export function getMonthsInRange(start: Date, end: Date): DateRange[] {
  const months: DateRange[] = [];
  let current = startOfMonth(start);
  
  while (current <= end) {
    const monthEnd = endOfMonth(current);
    months.push({
      start: current,
      end: monthEnd > end ? end : monthEnd,
    });
    current = new Date(monthEnd);
    current.setDate(current.getDate() + 1);
  }
  
  return months;
}


