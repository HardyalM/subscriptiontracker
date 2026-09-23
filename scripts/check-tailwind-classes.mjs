// Fails if any Tailwind colour-opacity class used in src generated no CSS.
//
// Tailwind 3 silently drops an opacity modifier that is not on its opacity
// scale: `border-ink-muted/12` compiles to nothing, with no warning, and the
// element simply renders without a border. That is how the hairline border
// on every card, and the focus ring on every input, went missing from v1
// onward without anyone noticing. This runs after `vite build` and checks
// every such class against the stylesheet that was actually produced.
//
// Usage: npm run build && node scripts/check-tailwind-classes.mjs

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const cssFile = readdirSync('dist/assets').find((f) => f.endsWith('.css'))
if (!cssFile) {
  console.error('No built stylesheet in dist/assets — run `npm run build` first.')
  process.exit(2)
}
const css = readFileSync(join('dist/assets', cssFile), 'utf8')

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path) : /\.(jsx?|tsx?)$/.test(name) ? [path] : []
  })
}

const CLASS = /(?<![\w/[])((?:[a-z]+:)*[a-z][a-z0-9]*(?:-[a-z0-9]+)+)\/(\d+)(?![\d\]\w.])/g
const UTILITY = /^(?:[a-z]+:)*(bg|text|border|ring|divide|shadow|from|via|to|decoration|outline|placeholder|fill|stroke)-/

const missing = new Map()
for (const file of walk('src')) {
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      for (const [, base, n] of line.matchAll(CLASS)) {
        if (!UTILITY.test(base)) continue
        const cls = `${base}/${n}`
        const escaped = cls.split(':').pop().replace('/', '\\/')
        if (css.includes(`.${escaped}`) || css.includes(`:${escaped}`)) continue
        if (!missing.has(cls)) missing.set(cls, `${file}:${i + 1}`)
      }
    })
}

if (missing.size > 0) {
  console.error(`${missing.size} Tailwind class(es) generated no CSS:\n`)
  for (const [cls, where] of missing) console.error(`  ${cls.padEnd(34)} ${where}`)
  console.error('\nEither use a value on the opacity scale, bracket it (/[0.12]), or extend theme.opacity.')
  process.exit(1)
}
console.log('Every Tailwind opacity class in src generated CSS.')
