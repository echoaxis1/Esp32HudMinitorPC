import { Store } from '@tanstack/react-store'

export interface DashboardSettings {
  autoRefresh: boolean
  refreshIntervalMs: number
  showExternalDisks: boolean
  temperatureUnit: 'C' | 'F'
  activeNav: string
}

export const dashboardStore = new Store<DashboardSettings>({
  autoRefresh: true,
  refreshIntervalMs: 2000,
  showExternalDisks: true,
  temperatureUnit: 'C',
  activeNav: 'dashboard',
})

export function setAutoRefresh(enabled: boolean) {
  dashboardStore.setState(prev => ({
    ...prev,
    autoRefresh: enabled,
  }))
}

export function setRefreshInterval(ms: number) {
  dashboardStore.setState(prev => ({
    ...prev,
    refreshIntervalMs: ms,
  }))
}

export function toggleTemperatureUnit() {
  dashboardStore.setState(prev => ({
    ...prev,
    temperatureUnit: prev.temperatureUnit === 'C' ? 'F' : 'C',
  }))
}
