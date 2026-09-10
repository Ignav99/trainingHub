import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildInformeShow,
  buildPlanShow,
  chapterIndexForSlide,
  playableClipUrl,
  showChapters,
} from './dossierShow.ts'

describe('dossier live show builder', () => {
  it('interleaves a phase slide then that phase’s playable clips', () => {
    const show = buildInformeShow(
      {
        fases: [
          {
            fase: 'ataque_organizado',
            fortalezas: ['Sale por fuera'],
            debilidades: [],
            clips: [
              { id: 'c1', titulo: 'Salida derecha', url: 'https://cdn.example/a.mp4', fase: 'ataque_organizado', notas: '' },
              { id: 'c2', titulo: 'Sin archivo', fase: 'ataque_organizado', notas: '' },
              { id: 'c3', titulo: 'Segundo clip', url: '  https://cdn.example/b.mp4  ', fase: 'ataque_organizado', notas: '' },
            ],
          },
        ],
      },
      { rivalNombre: 'Racing' }
    )

    assert.equal(show.slides[0].kind, 'portada')
    assert.equal(show.slides[0].title, 'Racing')
    assert.deepEqual(
      show.slides.slice(1).map((slide) => slide.kind),
      ['fase', 'video', 'video']
    )
    assert.equal(show.slides[1].kind === 'fase' && show.slides[1].title, 'Ataque organizado')
    assert.equal(show.slides[2].kind === 'video' && show.slides[2].title, 'Salida derecha')
    assert.equal(show.slides[2].kind === 'video' && show.slides[2].src, 'https://cdn.example/a.mp4')
    assert.equal(show.slides[3].kind === 'video' && show.slides[3].src, 'https://cdn.example/b.mp4')
    assert.equal(show.slides.some((slide) => slide.kind === 'video' && slide.title === 'Sin archivo'), false)
  })

  it('skips empty phases and still shows a title slide when a phase only has video', () => {
    const show = buildPlanShow({
      ataque_organizado: '',
      defensa_organizada: '',
      transicion_ofensiva: '',
      transicion_defensiva: '',
      abp_ofensiva: '',
      abp_defensiva: '',
      fases: [
        { fase: 'defensa_organizada', clips: [] },
        {
          fase: 'transicion_ofensiva',
          clips: [{ id: 't1', titulo: 'Contra', url: 'blob:http://local/clip', fase: 'transicion_ofensiva', notas: '' }],
        },
      ],
    })

    const kinds = show.slides.map((slide) => `${slide.kind}:${'fase' in slide ? slide.fase : 'portada'}`)
    assert.deepEqual(kinds, [
      'portada:portada',
      'fase:transicion_ofensiva',
      'video:transicion_ofensiva',
    ])
    assert.equal(show.slides[1].kind === 'fase' && show.slides[1].bullets.length, 0)
  })

  it('builds rundown chapters so a phase and its videos share one jump target', () => {
    const show = buildInformeShow({
      fases: [
        {
          fase: 'ataque_organizado',
          fortalezas: ['Presión'],
          debilidades: [],
          clips: [{ id: 'a', titulo: 'Clip', url: 'https://x/a.mp4', fase: 'ataque_organizado', notas: '' }],
        },
        {
          fase: 'abp_ofensiva',
          fortalezas: ['Córner corto'],
          debilidades: [],
          clips: [],
        },
      ],
    })
    const chapters = showChapters(show.slides)
    assert.deepEqual(
      chapters.map((chapter) => ({ id: chapter.id, videos: chapter.videoCount, count: chapter.slideCount })),
      [
        { id: 'portada', videos: 0, count: 1 },
        { id: 'ataque_organizado', videos: 1, count: 2 },
        { id: 'abp_ofensiva', videos: 0, count: 1 },
      ]
    )
    assert.equal(chapterIndexForSlide(chapters, 2), 1)
    assert.equal(chapterIndexForSlide(chapters, 3), 2)
  })

  it('ignores blank clip urls', () => {
    assert.equal(playableClipUrl(undefined), null)
    assert.equal(playableClipUrl('   '), null)
    assert.equal(playableClipUrl('https://ok'), 'https://ok')
  })

  it('inserts contexto and once slides after the cover, skipping empties', () => {
    const show = buildInformeShow({
      estrategia: {
        notas: 'Presiona alto y corta por dentro',
        dimensiones_campo: '105 x 68',
        sistema: '4-3-3',
        once_probable: {
          actas_analizadas: 4,
          jugadores: [
            { nombre: 'García', dorsal: 10, apariciones: 8, rol: 'interior', comentario: 'llega tarde' },
            { nombre: 'López', dorsal: 9, apariciones: 8, comentario: '' },
          ],
          colocacion: { st: 'López' },
        },
      },
      fases: [{ fase: 'ataque_organizado', fortalezas: ['Sale por fuera'], debilidades: [], clips: [] }],
    })

    assert.deepEqual(
      show.slides.map((slide) => slide.kind),
      ['portada', 'contexto', 'once', 'fase']
    )
    assert.equal(show.slides[1].kind === 'contexto' && show.slides[1].bullets[0], 'Presiona alto y corta por dentro')
    assert.equal(show.slides[1].kind === 'contexto' && show.slides[1].bullets.includes('Campo 105 x 68'), true)
    assert.equal(show.slides[2].kind === 'once' && show.slides[2].bullets[0], '4-3-3')
    assert.equal(
      show.slides[2].kind === 'once' && show.slides[2].bullets.some((b) => b.includes('García') && b.includes('llega tarde')),
      true
    )
    assert.equal(
      show.slides[2].kind === 'once' && show.slides[2].bullets.some((b) => b.includes('López')),
      false
    )
  })

  it('does not invent contexto or once slides on the match plan', () => {
    const show = buildPlanShow({
      ataque_organizado: 'Salir por fuera',
      defensa_organizada: '',
      transicion_ofensiva: '',
      transicion_defensiva: '',
      abp_ofensiva: '',
      abp_defensiva: '',
      fases: [{ fase: 'ataque_organizado', texto: 'Salir por fuera', clips: [] }],
    })
    assert.equal(show.slides.some((slide) => slide.kind === 'contexto' || slide.kind === 'once'), false)
  })

  it('puts an animated board on the phase slide and still shows a board-only phase', () => {
    const animated = {
      elements: [{ id: 'p1', type: 'player', position: { x: 10, y: 20 } }],
      arrows: [],
      zones: [],
      tipo: 'animated' as const,
      pitchType: 'full' as const,
      frames: [
        {
          id: 'f0',
          orden: 0,
          duration_ms: 800,
          elements: [{ id: 'p1', type: 'player', position: { x: 10, y: 20 } }],
          arrows: [],
          zones: [],
          transition_type: 'linear' as const,
        },
        {
          id: 'f1',
          orden: 1,
          duration_ms: 800,
          elements: [{ id: 'p1', type: 'player', position: { x: 40, y: 50 } }],
          arrows: [],
          zones: [],
          transition_type: 'linear' as const,
        },
      ],
    }

    const show = buildInformeShow({
      fases: [
        {
          fase: 'transicion_ofensiva',
          fortalezas: [],
          debilidades: [],
          clips: [],
          pizarra_diagrama: animated,
        },
      ],
    })

    assert.equal(show.slides[1].kind, 'fase')
    assert.equal(show.slides[1].kind === 'fase' && show.slides[1].title, 'Transición ofensiva')
    assert.equal(show.slides[1].kind === 'fase' && show.slides[1].board?.tipo, 'animated')
    assert.equal(show.slides[1].kind === 'fase' && (show.slides[1].board?.frames?.length ?? 0) >= 2, true)
  })
})
