<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { useMailStore } from '../../stores/mail'
import SettingsContent from '../settings/SettingsContent.vue'

const store = useMailStore()
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="store.isSettingsOpen"
        class="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
        style="background: rgba(20,30,60,0.22);"
        @click.self="store.isSettingsOpen = false"
      >
        <div class="df-settings-dialog relative w-full max-w-5xl mx-4 max-h-[90vh] overflow-y-auto" style="border-radius: 22px; background: rgba(252,254,255,0.90); backdrop-filter: blur(32px) saturate(1.8); border: 1px solid rgba(255,255,255,0.38); box-shadow: 0 20px 52px rgba(0,0,0,0.13), 0 6px 18px rgba(0,0,0,0.07);">
          <button
            class="absolute right-4 top-4 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            @click="store.isSettingsOpen = false"
          >
            <X class="size-4" />
          </button>
          <SettingsContent />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.dark .df-settings-dialog {
  background: rgba(10, 20, 44, 0.90) !important;
  border-color: rgba(255,255,255,0.08) !important;
}
</style>
