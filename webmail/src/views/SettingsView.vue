<script setup lang="ts">
import { ref, watch } from 'vue'
import { useInstallPrompt } from '@/composables/useInstallPrompt'
import { useNotificationsStore } from '@/stores/notifications'
import { usePushSubscription } from '@/composables/usePushSubscription'
import { useMailStore } from '@/stores/mail'
import { mailApi } from '@/api/mail'

const { canInstall, promptInstall } = useInstallPrompt()
const notificationsStore = useNotificationsStore()
const push = usePushSubscription()
const mailStore = useMailStore()

const notificationPreview = ref(true)
const previewLoading = ref(false)

watch(
  () => mailStore.currentMailbox,
  async (address) => {
    if (!address) return
    try {
      const res = await mailApi.getMailboxPreferences(address)
      notificationPreview.value = res.data.notification_preview
    } catch { /* ignore */ }
  },
  { immediate: true }
)

async function togglePreview() {
  if (!mailStore.currentMailbox || previewLoading.value) return
  previewLoading.value = true
  const next = !notificationPreview.value
  try {
    await mailApi.updateMailboxPreferences(mailStore.currentMailbox, { notification_preview: next })
    notificationPreview.value = next
  } catch { /* ignore */ } finally {
    previewLoading.value = false
  }
}
</script>

<template>
  <div class="p-8 max-w-2xl">
    <h1 class="text-2xl font-semibold mb-6">Settings</h1>

    <div v-if="canInstall" class="mb-4 rounded-lg border p-4 space-y-3">
      <div>
        <h2 class="text-sm font-medium">Install App</h2>
        <p class="text-sm text-muted-foreground mt-0.5">
          Install DockFlare Mail as a desktop app for faster access and desktop notifications.
        </p>
      </div>
      <button
        class="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        @click="promptInstall"
      >
        Install
      </button>
    </div>

    <div class="mb-4 rounded-lg border p-4 space-y-3">
      <div>
        <h2 class="text-sm font-medium">Notifications</h2>
        <p class="text-sm text-muted-foreground mt-0.5">
          Get notified when new mail arrives, even when the app is closed.
        </p>
      </div>

      <template v-if="notificationsStore.isDenied">
        <p class="text-sm text-muted-foreground">
          Notifications are blocked. Enable them in your browser or OS settings.
        </p>
      </template>

      <template v-else-if="!notificationsStore.isGranted">
        <button
          class="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          @click="notificationsStore.requestPermission"
        >
          Enable Notifications
        </button>
      </template>

      <template v-else>
        <p class="text-sm text-muted-foreground">Permission granted.</p>
        <div v-if="push.isSupported && mailStore.currentMailbox" class="flex items-center gap-3">
          <span class="text-sm">Background push for {{ mailStore.currentMailbox }}</span>
          <button
            v-if="!push.isSubscribed.value"
            :disabled="push.isLoading.value"
            class="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            @click="push.subscribe(mailStore.currentMailbox)"
          >
            Enable
          </button>
          <button
            v-else
            :disabled="push.isLoading.value"
            class="inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
            @click="push.unsubscribe()"
          >
            Disable
          </button>
        </div>
        <p v-else-if="!push.isSupported" class="text-sm text-muted-foreground">
          Background push is not supported in this browser.
        </p>

        <div v-if="mailStore.currentMailbox" class="flex items-center gap-3 pt-1">
          <span class="text-sm">Show subject &amp; sender in notifications</span>
          <button
            :disabled="previewLoading"
            class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 disabled:opacity-50"
            :class="notificationPreview ? 'bg-primary' : 'bg-muted'"
            role="switch"
            :aria-checked="notificationPreview"
            @click="togglePreview"
          >
            <span
              class="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200"
              :class="notificationPreview ? 'translate-x-5' : 'translate-x-0'"
            />
          </button>
        </div>
      </template>
    </div>

    <p class="text-sm text-muted-foreground">Additional settings are managed in DockFlare Master.</p>
  </div>
</template>
