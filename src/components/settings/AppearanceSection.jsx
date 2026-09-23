import { useAppearance, ACCENTS } from '../../lib/appearance.jsx'
import { IconSun, IconMoon, IconMonitor, IconCheck } from '../Icon.jsx'
import SegmentedControl from '../ui/SegmentedControl.jsx'
import Switch from '../ui/Switch.jsx'
import { SettingsCard, SettingRow } from './SettingsCard.jsx'

export default function AppearanceSection() {
  const { theme, setTheme, accent, setAccent, density, setDensity, reducedMotion, setReducedMotion } = useAppearance()

  return (
    <div className="space-y-5">
      <SettingsCard title="Theme" description="Saved on this device, and applied before the page draws — no flash on load.">
        <SettingRow
          title="Colour mode"
          description="System follows your device, including if it switches at sunset."
          control={
            <div className="w-full sm:w-[21rem]">
              <SegmentedControl
                label="Colour mode"
                value={theme}
                onChange={setTheme}
                options={[
                  { value: 'light', label: 'Light', icon: <IconSun className="h-4 w-4" /> },
                  { value: 'dark', label: 'Dark', icon: <IconMoon className="h-4 w-4" /> },
                  { value: 'system', label: 'System', icon: <IconMonitor className="h-4 w-4" /> },
                ]}
              />
            </div>
          }
        />
      </SettingsCard>

      <SettingsCard
        title="Accent colour"
        description="Primary buttons, focus rings and active states. Chart categories keep their own colours, so switching this never repaints your data."
      >
        <div className="px-card-pad py-4">
          <div role="radiogroup" aria-label="Accent colour" className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {ACCENTS.map((option) => {
              const selected = option.id === accent
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setAccent(option.id)}
                  className={`group flex items-center gap-3 rounded-xl border p-3 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 ${
                    selected
                      ? 'border-brand-500/60 bg-accent-soft/60 shadow-sm'
                      : 'border-ink-muted/15 hover:border-ink-muted/35 hover:bg-surface-sunken'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]"
                    style={{ backgroundColor: option.swatch }}
                  >
                    {selected && <IconCheck className="h-4 w-4 text-white" />}
                  </span>
                  <span className="text-sm font-semibold text-ink-primary">{option.label}</span>
                </button>
              )
            })}
          </div>

          {/* A live preview in the chosen accent, so the effect of the choice
              is visible without leaving the page. */}
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-surface-sunken/70 px-4 py-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-secondary">Preview</span>
            <span className="inline-flex h-8 items-center rounded-lg bg-accent px-3 text-[13px] font-semibold text-accent-fg shadow-action">
              Primary action
            </span>
            <span className="text-[13px] font-semibold text-accent-text underline underline-offset-4">A link</span>
            <span className="inline-flex h-8 items-center rounded-lg border border-brand-500 bg-surface px-3 text-[13px] text-ink-primary shadow-[0_0_0_3px_rgb(var(--brand-500)/0.18)]">
              Focused field
            </span>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard title="Layout">
        <SettingRow
          title="Density"
          description="Compact tightens rows and cards so more fits on screen."
          control={
            <div className="w-full sm:w-[16rem]">
              <SegmentedControl
                label="Density"
                value={density}
                onChange={setDensity}
                options={[
                  { value: 'spacious', label: 'Spacious' },
                  { value: 'compact', label: 'Compact' },
                ]}
              />
            </div>
          }
        />
        <SettingRow
          title="Reduce motion"
          description="Turns off animation throughout the app. Starts from your device's setting, but you can change it here either way."
          control={<Switch label="Reduce motion" checked={reducedMotion} onChange={setReducedMotion} />}
        />
      </SettingsCard>
    </div>
  )
}
