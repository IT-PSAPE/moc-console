import globals from 'globals'
import apiConfig from '../apps/api/eslint.config.js'

export default apiConfig.map((config) => config.files ? {
  ...config,
  files: ['**/*.{ts,tsx}'],
  languageOptions: {
    ...config.languageOptions,
    globals: { ...globals.node, ...globals.browser },
  },
} : config)
