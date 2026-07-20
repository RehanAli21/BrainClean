import { Colors } from '@/constants/theme'
import { useUiStore } from '@/store/uiStore'
import { useColorScheme } from 'react-native'

export type ThemeMode = 'system' | 'light' | 'dark'

export function useTheme() {
  const themeMode = useUiStore(s => s.themeMode)
  const systemScheme = useColorScheme()

  if (themeMode === 'light') return Colors.light
  if (themeMode === 'dark') return Colors.dark
  return systemScheme === 'light' ? Colors.light : Colors.dark
}

export function useThemeMode() {
  const themeMode = useUiStore(s => s.themeMode)
  const systemScheme = useColorScheme()

  if (themeMode === 'light') return 'light' as const
  if (themeMode === 'dark') return 'dark' as const
  return (systemScheme ?? 'dark') as 'light' | 'dark'
}
