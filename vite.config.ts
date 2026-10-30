import 'dotenv/config'
import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import tsconfigPaths from 'vite-tsconfig-paths'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitroV2Plugin } from "@tanstack/nitro-v2-vite-plugin";
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  // Bundle server deps that nitro would otherwise leave to the lambda's
  // node_modules — Vercel's runtime resolution of the shipped tree has
  // missed some (e.g. lucide-react), 500ing every request.
  ssr: {
    noExternal: ["lucide-react"],
  },
  plugins: [
    devtools(),
    tsconfigPaths({ projects: ['./tsconfig.json'] }),
    tailwindcss(),
    nitroV2Plugin({
      preset: "vercel",
      compatibilityDate: "2025-10-26",
    }),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
