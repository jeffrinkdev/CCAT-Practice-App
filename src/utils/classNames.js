export function joinClassNames(...parts) {
  return parts.filter(Boolean).join(' ')
}