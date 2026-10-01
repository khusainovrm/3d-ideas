export interface ScrollGate {
  lock(scrollY?: number): void
  unlock(): number
  dispose(): void
  readonly locked: boolean
}

const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '])

export const createScrollGate = (): ScrollGate => {
  let isLocked = false
  let savedScrollY = 0
  let htmlOverflow = ''
  let bodyOverflow = ''
  let bodyPosition = ''
  let bodyTop = ''
  let bodyWidth = ''

  const preventScroll = (event: Event): void => event.preventDefault()
  const preventKey = (event: KeyboardEvent): void => {
    if (SCROLL_KEYS.has(event.key)) event.preventDefault()
  }

  const addListeners = (): void => {
    window.addEventListener('wheel', preventScroll, { passive: false })
    window.addEventListener('touchmove', preventScroll, { passive: false })
    window.addEventListener('keydown', preventKey, { passive: false })
  }

  const removeListeners = (): void => {
    window.removeEventListener('wheel', preventScroll)
    window.removeEventListener('touchmove', preventScroll)
    window.removeEventListener('keydown', preventKey)
  }

  return {
    get locked() { return isLocked },
    lock(scrollY = window.scrollY) {
      if (isLocked) return
      isLocked = true
      savedScrollY = scrollY
      htmlOverflow = document.documentElement.style.overflow
      bodyOverflow = document.body.style.overflow
      bodyPosition = document.body.style.position
      bodyTop = document.body.style.top
      bodyWidth = document.body.style.width
      document.documentElement.style.overflow = 'hidden'
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.top = `${-savedScrollY}px`
      document.body.style.width = '100%'
      addListeners()
    },
    unlock() {
      if (!isLocked) return window.scrollY
      isLocked = false
      removeListeners()
      document.documentElement.style.overflow = htmlOverflow
      document.body.style.overflow = bodyOverflow
      document.body.style.position = bodyPosition
      document.body.style.top = bodyTop
      document.body.style.width = bodyWidth
      window.scrollTo(0, savedScrollY)
      return savedScrollY
    },
    dispose() {
      if (isLocked) this.unlock()
      removeListeners()
    },
  }
}
