export function formatDateShort (s?: string): string | undefined {
  if (!s) return undefined
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  const months = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.']
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

