import { Archivo, Big_Shoulders_Display, Fragment_Mono } from 'next/font/google'

export const fontDisplay = Big_Shoulders_Display({
  subsets: ['latin', 'latin-ext'],
  weight: ['700', '800'],
  variable: '--inf-display',
  display: 'block',
})

export const fontBody = Archivo({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  variable: '--inf-body',
  display: 'block',
})

export const fontMono = Fragment_Mono({
  subsets: ['latin', 'latin-ext'],
  weight: '400',
  variable: '--inf-mono',
  display: 'block',
})

export const informeFontVars = `${fontDisplay.variable} ${fontBody.variable} ${fontMono.variable}`
