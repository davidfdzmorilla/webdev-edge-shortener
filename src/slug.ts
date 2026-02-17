import { customAlphabet } from 'nanoid'

const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const generate = customAlphabet(alphabet, 7)

const SLUG_RE = /^[a-zA-Z0-9_-]{3,50}$/

export function generateSlug(): string {
  return generate()
}

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug)
}
