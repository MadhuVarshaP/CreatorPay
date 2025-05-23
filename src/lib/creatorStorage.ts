export const CREATOR_NAMES_KEY = 'creatorNames'

export interface StoredCreatorNames {
  [address: string]: string
}

// Get all stored creator names
export const getStoredCreatorNames = (): StoredCreatorNames => {
  if (typeof window === 'undefined') return {}
  try {
    const stored = localStorage.getItem(CREATOR_NAMES_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch (error) {
    console.error('Error reading creator names from localStorage:', error)
    return {}
  }
}

// Get a specific creator's name - returns the stored name or fallback
export const getCreatorName = (address: string): string => {
  const storedNames = getStoredCreatorNames()
  const storedName = storedNames[address]
  
  if (storedName && storedName.trim()) {
    return storedName.trim()
  }
  
  // Fallback to truncated address format
  return `Creator ${address.slice(0, 6)}...${address.slice(-4)}`
}

// Store a creator's name
export const storeCreatorName = (address: string, name: string): void => {
  if (typeof window === 'undefined') return
  
  try {
    const storedNames = getStoredCreatorNames()
    const trimmedName = name.trim()
    
    if (trimmedName) {
      storedNames[address] = trimmedName
      localStorage.setItem(CREATOR_NAMES_KEY, JSON.stringify(storedNames))
      console.log(`✅ Stored creator name: "${trimmedName}" for address: ${address}`)
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('creatorNameUpdated', {
        detail: { address, name: trimmedName }
      }))
    }
  } catch (error) {
    console.error('Error storing creator name:', error)
  }
}

// Check if a creator name exists for an address
export const hasCreatorName = (address: string): boolean => {
  const storedNames = getStoredCreatorNames()
  return !!(storedNames[address] && storedNames[address].trim())
}

// Remove a creator's name
export const removeCreatorName = (address: string): void => {
  if (typeof window === 'undefined') return
  
  try {
    const storedNames = getStoredCreatorNames()
    delete storedNames[address]
    localStorage.setItem(CREATOR_NAMES_KEY, JSON.stringify(storedNames))
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('creatorNameUpdated', {
      detail: { address, name: null }
    }))
  } catch (error) {
    console.error('Error removing creator name:', error)
  }
}

// Get all creator names as an array
export const getAllCreatorNames = (): Array<{address: string, name: string}> => {
  const storedNames = getStoredCreatorNames()
  return Object.entries(storedNames)
    .filter(([, name]) => name && name.trim())
    .map(([address, name]) => ({
      address,
      name: name.trim()
    }))
}