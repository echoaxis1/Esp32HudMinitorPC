import 'reflect-metadata'

// Pastikan method reflect-metadata terpasang di runtime
if (typeof Reflect !== 'undefined') {
  const r = Reflect
  if (!r.getMetadata) r.getMetadata = () => undefined
  if (!r.getOwnMetadata) r.getOwnMetadata = () => undefined
}

// Jalankan standalone server Nitro
await import('./.output/server/index.mjs')
