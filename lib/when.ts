/** "today", "yesterday", or "Oct 12" (with the year when it is not this year). Server time zone. */
export function when(date: Date, now = new Date()): string {
  const day = (d: Date) => Math.floor(d.getTime() / 86_400_000);
  const diff = day(now) - day(date);
  if (diff <= 0) return "today";
  if (diff === 1) return "yesterday";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  });
}
