// Tracks who is acting on this device, for the activity log.
let currentUser = 'System'

export function setCurrentUser(name: string): void {
  currentUser = name || 'System'
}

export function getCurrentUser(): string {
  return currentUser
}
