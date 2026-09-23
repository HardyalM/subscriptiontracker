import { IconUser, IconPalette, IconBell, IconWarning } from '../Icon.jsx'
import ProfileSection from './ProfileSection.jsx'
import AppearanceSection from './AppearanceSection.jsx'
import PreferencesSection from './PreferencesSection.jsx'
import DangerZoneSection from './DangerZoneSection.jsx'

export const SETTINGS_SECTIONS = [
  { id: 'profile', label: 'Profile', icon: IconUser, description: 'Your account and workspace.', Component: ProfileSection },
  { id: 'appearance', label: 'Appearance', icon: IconPalette, description: 'Theme, accent colour and layout.', Component: AppearanceSection },
  { id: 'preferences', label: 'Preferences', icon: IconBell, description: 'Alerts and reminders.', Component: PreferencesSection },
  { id: 'danger', label: 'Danger Zone', icon: IconWarning, description: 'Permanent actions.', Component: DangerZoneSection, danger: true },
]

/**
 * Settings, with vertical tabs on the left from `md` up and a scrolling tab
 * strip on smaller screens.
 *
 * Each section is its own address (#/settings/appearance), so the back
 * button and a shared link both land where you expect.
 */
export default function SettingsPage({ section, onNavigate }) {
  const active = SETTINGS_SECTIONS.find((s) => s.id === section) ?? SETTINGS_SECTIONS[0]
  const { Component } = active

  return (
    <div className="animate-rise-in">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink-primary">Settings</h1>
        <p className="mt-1 text-sm text-ink-secondary">Manage your account and how the app looks and behaves.</p>
      </div>

      <div className="md:grid md:grid-cols-[13.5rem_minmax(0,1fr)] md:gap-10">
        <nav aria-label="Settings sections" className="mb-6 md:mb-0">
          <ul className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 md:sticky md:top-24 md:mx-0 md:flex-col md:overflow-visible md:px-0">
            {SETTINGS_SECTIONS.map((item) => {
              const current = item.id === active.id
              const Icon = item.icon
              return (
                <li key={item.id} className="shrink-0">
                  <a
                    href={`#/settings/${item.id}`}
                    aria-current={current ? 'page' : undefined}
                    onClick={(e) => {
                      e.preventDefault()
                      onNavigate(`settings/${item.id}`)
                    }}
                    className={`relative flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 ${
                      current
                        ? item.danger
                          ? 'bg-status-critical/[0.08] text-status-critical-text'
                          : 'bg-surface text-ink-primary shadow-card ring-1 ring-ink-muted/12'
                        : item.danger
                          ? 'text-status-critical-text/80 hover:bg-status-critical/[0.06] hover:text-status-critical-text'
                          : 'text-ink-secondary hover:bg-surface-sunken hover:text-ink-primary'
                    }`}
                  >
                    {current && !item.danger && (
                      <span aria-hidden="true" className="absolute inset-y-2 left-0 hidden w-[3px] rounded-full bg-accent md:block" />
                    )}
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>

        <div key={active.id} className="min-w-0 animate-rise-in">
          <div className="mb-5">
            <h2 className={`font-display text-lg font-bold tracking-tight ${active.danger ? 'text-status-critical-text' : 'text-ink-primary'}`}>
              {active.label}
            </h2>
            <p className="mt-0.5 text-sm text-ink-secondary">{active.description}</p>
          </div>
          <Component />
        </div>
      </div>
    </div>
  )
}
