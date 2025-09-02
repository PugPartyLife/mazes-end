export function stripParens (s: string): string {
  if (!s) return s
  return s.replace(/^\(\s*/, '').replace(/\s*\)$/, '')
}

