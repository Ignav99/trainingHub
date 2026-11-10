import { KabineLoader } from '@/components/ui/kabine-loader'

export default function AuthLoading() {
  return (
    <>
      <div className="no-cal">
        <KabineLoader fullScreen size="lg" />
      </div>
      <div className="solo-cal min-h-screen bg-background" />
    </>
  )
}
