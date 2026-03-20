'use client'

import { useMemo } from 'react'
import type { Clip, FreezeFrame } from './types'

export interface TimeSegment {
  type: 'video' | 'freeze'
  virtualStart: number
  virtualEnd: number
  realStart?: number
  realEnd?: number
  freezeFrame?: FreezeFrame
}

/**
 * Build ordered segments for a clip's virtual timeline.
 * Video segments represent real video time; freeze segments
 * represent inserted freeze frame pauses.
 */
export function buildSegments(clip: Clip): TimeSegment[] {
  const sorted = [...clip.freezeFrames].sort((a, b) => a.timestamp - b.timestamp)
  const segs: TimeSegment[] = []
  let vt = 0
  let rt = clip.startTime

  for (const ff of sorted) {
    if (ff.timestamp > rt) {
      const dur = ff.timestamp - rt
      segs.push({
        type: 'video',
        virtualStart: vt,
        virtualEnd: vt + dur,
        realStart: rt,
        realEnd: ff.timestamp,
      })
      vt += dur
    }
    segs.push({
      type: 'freeze',
      virtualStart: vt,
      virtualEnd: vt + ff.duration,
      freezeFrame: ff,
    })
    vt += ff.duration
    rt = ff.timestamp
  }

  if (rt < clip.endTime) {
    const dur = clip.endTime - rt
    segs.push({
      type: 'video',
      virtualStart: vt,
      virtualEnd: vt + dur,
      realStart: rt,
      realEnd: clip.endTime,
    })
  }

  return segs
}

/**
 * Total virtual duration = clip real duration + sum of freeze durations.
 */
export function getTotalVirtualDuration(clip: Clip): number {
  const clipDur = clip.endTime - clip.startTime
  const freezeTotal = clip.freezeFrames.reduce((sum, ff) => sum + ff.duration, 0)
  return clipDur + freezeTotal
}

/**
 * Convert virtual time → real video time or freeze frame position.
 */
export function virtualToReal(
  segments: TimeSegment[],
  vt: number
): { type: 'video'; time: number } | { type: 'freeze'; frame: FreezeFrame; offset: number } {
  for (const seg of segments) {
    if (vt >= seg.virtualStart && vt < seg.virtualEnd) {
      if (seg.type === 'video' && seg.realStart !== undefined) {
        return { type: 'video', time: seg.realStart + (vt - seg.virtualStart) }
      }
      if (seg.type === 'freeze' && seg.freezeFrame) {
        return { type: 'freeze', frame: seg.freezeFrame, offset: vt - seg.virtualStart }
      }
    }
  }
  // Past end — return last video position
  const last = segments[segments.length - 1]
  if (last?.type === 'video' && last.realEnd !== undefined) {
    return { type: 'video', time: last.realEnd }
  }
  return { type: 'video', time: 0 }
}

/**
 * Convert real video time → virtual time.
 */
export function realToVirtual(segments: TimeSegment[], rt: number): number {
  for (const seg of segments) {
    if (seg.type === 'video' && seg.realStart !== undefined && seg.realEnd !== undefined) {
      if (rt >= seg.realStart && rt <= seg.realEnd) {
        return seg.virtualStart + (rt - seg.realStart)
      }
    }
  }
  // Fallback: find closest video segment
  let best = 0
  for (const seg of segments) {
    if (seg.type === 'video' && seg.realStart !== undefined) {
      if (rt >= seg.realStart) {
        best = seg.virtualStart + Math.min(
          rt - seg.realStart,
          seg.virtualEnd - seg.virtualStart
        )
      }
    }
  }
  return best
}

/**
 * Hook: compute virtual timeline segments and total duration for a clip.
 */
export function useVirtualTimeline(clip: Clip | null) {
  return useMemo(() => {
    if (!clip) return { segments: [] as TimeSegment[], totalDuration: 0 }
    return {
      segments: buildSegments(clip),
      totalDuration: getTotalVirtualDuration(clip),
    }
  }, [clip])
}
