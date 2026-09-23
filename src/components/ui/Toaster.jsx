import { Toaster as SonnerToaster } from 'sonner'
import { useAppearance } from '../../lib/appearance.jsx'

/**
 * The toast region. Bottom-right on desktop, bottom-centre on a phone where
 * a corner toast would be cramped. Toasts render their own card (see
 * lib/notify.jsx), so Sonner's styling is switched off.
 */
export default function Toaster() {
  const { resolvedTheme } = useAppearance()
  return (
    <SonnerToaster
      theme={resolvedTheme}
      position="bottom-right"
      gap={10}
      visibleToasts={4}
      offset={20}
      mobileOffset={16}
      toastOptions={{ unstyled: true }}
    />
  )
}
