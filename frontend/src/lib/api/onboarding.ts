import { api } from './client'
import { OnboardingCheckResponse } from '@/types'

export const onboardingApi = {
  check: () =>
    api.get<OnboardingCheckResponse>('/onboarding/check'),

  completePaso: (paso: string, datos: Record<string, any>) =>
    api.post<{ success: boolean }>(`/onboarding/paso/${paso}`, datos),

  completeAll: () =>
    api.post<{ success: boolean }>('/onboarding/completar'),
}
