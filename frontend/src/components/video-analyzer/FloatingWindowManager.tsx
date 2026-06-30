'use client'
import { WindowChrome } from './WindowChrome'
import { BotoneraWindow } from './windows/BotoneraWindow'
import { OrganizerWindow } from './windows/OrganizerWindow'
import { StudioWindow } from './windows/StudioWindow'
import { useFloatingWindows } from './useFloatingWindows'

interface FloatingWindowManagerProps {
  videoSrc: string
  currentTime: number
  videoDuration: number
  videoKey: string
  onTagCreated: (ev: { buttonId: string; startTime: number; endTime: number }) => void
  onSeekTo: (time: number) => void
}

export function FloatingWindowManager({
  videoSrc,
  currentTime,
  videoDuration,
  videoKey,
  onTagCreated,
  onSeekTo,
}: FloatingWindowManagerProps) {
  const { windows, closeWindow, focusWindow, moveWindow, resizeWindow, toggleMinimize, openWindow } = useFloatingWindows()

  const handleOpenStudio = (eventId: string) => {
    openWindow('studio', { title: 'Studio', clipId: eventId })
  }

  return (
    <>
      {windows.map(win => (
        <WindowChrome
          key={win.id}
          id={win.id}
          title={win.title}
          x={win.x}
          y={win.y}
          width={win.width}
          height={win.height}
          minimized={win.minimized}
          zIndex={win.zIndex}
          onFocus={focusWindow}
          onMove={moveWindow}
          onClose={closeWindow}
          onMinimize={toggleMinimize}
          onResize={resizeWindow}
        >
          {win.type === 'botonera' && (
            <BotoneraWindow
              videoKey={videoKey}
              currentTime={currentTime}
              videoDuration={videoDuration}
              onTagCreated={onTagCreated}
            />
          )}
          {win.type === 'organizer' && (
            <OrganizerWindow
              videoSrc={videoSrc}
              onOpenInStudio={handleOpenStudio}
              onSeekTo={onSeekTo}
            />
          )}
          {win.type === 'studio' && win.clipId && (
            <StudioWindow
              videoSrc={videoSrc}
              eventId={win.clipId}
            />
          )}
        </WindowChrome>
      ))}
    </>
  )
}
