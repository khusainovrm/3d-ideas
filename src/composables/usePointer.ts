import { onMounted, onUnmounted, reactive, type Ref } from 'vue'

export const usePointer = (target: Ref<HTMLElement | null>) => {
  const pointer = reactive({ x: 0, y: 0, targetX: 0, targetY: 0 })

  const handlePointer = (event: PointerEvent): void => {
    const bounds = target.value?.getBoundingClientRect()
    if (!bounds) return
    pointer.targetX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2
    pointer.targetY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2
  }

  const update = (): void => {
    pointer.x += (pointer.targetX - pointer.x) * 0.035
    pointer.y += (pointer.targetY - pointer.y) * 0.035
  }

  onMounted(() => target.value?.addEventListener('pointermove', handlePointer, { passive: true }))
  onUnmounted(() => target.value?.removeEventListener('pointermove', handlePointer))

  return { pointer, updatePointer: update }
}
