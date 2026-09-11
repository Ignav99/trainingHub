import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildInformeShow,
  buildPlanShow,
  chapterIndexForSlide,
  attachRevisionPack,
  concatCharlaShow,
  playableClipUrl,
  showChapters,
  showPresenterLabel,
  slimShowForSync,
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
        { id: 'fase:ataque_organizado', videos: 1, count: 2 },
        { id: 'fase:abp_ofensiva', videos: 0, count: 1 },
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
    assert.equal(show.slides[2].kind === 'once' && show.slides[2].sistema, '4-3-3')
    assert.equal(
      show.slides[2].kind === 'once' && show.slides[2].bullets.some((b) => b.includes('García') && b.includes('llega tarde')),
      true
    )
    assert.equal(
      show.slides[2].kind === 'once' && show.slides[2].bullets.some((b) => b.includes('López')),
      false
    )
  })

  it('puts the once on a pitch with the formation and placed names', () => {
    const show = buildInformeShow({
      estrategia: {
        sistema: '4-3-3',
        once_probable: {
          actas_analizadas: 2,
          jugadores: [
            { nombre: 'García', dorsal: 10, apariciones: 8 },
            { nombre: 'López', dorsal: 9, apariciones: 8 },
          ],
          colocacion: { DC: 'López', MC_C: 'García' },
        },
      },
    })
    const once = show.slides.find((slide) => slide.kind === 'once')
    assert.equal(once?.kind, 'once')
    assert.equal(once?.kind === 'once' && once.sistema, '4-3-3')
    assert.equal(once?.kind === 'once' && once.colocacion?.DC, 'López')
    assert.equal(once?.kind === 'once' && once.colocacion?.MC_C, 'García')
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

  it('skips empty board jpegs when nothing is drawn', () => {
    const show = buildInformeShow({
      fases: [
        {
          fase: 'defensa_organizada',
          fortalezas: ['Bloque medio'],
          debilidades: [],
          clips: [],
          pizarra_tactica: 'data:image/jpeg;base64,AAAA',
          pizarra_diagrama: { elements: [], arrows: [], zones: [] },
        },
      ],
    })
    assert.equal(show.slides[1].kind, 'fase')
    assert.equal(show.slides[1].kind === 'fase' && show.slides[1].board, undefined)
    assert.equal(show.slides[1].kind === 'fase' && show.slides[1].boardSrc, undefined)
  })

  it('puts club and rival crests on the show, rival only on the cover', () => {
    const show = buildInformeShow(
      { fases: [] },
      {
        rivalNombre: 'Racing',
        clubNombre: 'CAC',
        clubEscudoUrl: 'https://cdn.example/cac.png',
        rivalEscudoUrl: 'https://cdn.example/racing.png',
      }
    )
    assert.equal(show.clubEscudoUrl, 'https://cdn.example/cac.png')
    assert.equal(show.rivalEscudoUrl, 'https://cdn.example/racing.png')
    assert.equal(show.slides[0].kind === 'portada' && show.slides[0].rivalEscudoUrl, 'https://cdn.example/racing.png')
  })

  it('interleaves hot revision clips after the matching phase and once', () => {
    const base = buildInformeShow({
      estrategia: {
        sistema: '4-3-3',
        once_probable: { actas_analizadas: 1, jugadores: [{ nombre: 'García', apariciones: 1, comentario: 'llega' }] },
      },
      fases: [
        {
          fase: 'ataque_organizado',
          fortalezas: ['Sale por fuera'],
          debilidades: [],
          clips: [{ id: 'inline', titulo: 'Ya estaba', url: 'https://cdn.example/inline.mp4', fase: 'ataque_organizado', notas: '' }],
        },
      ],
    })
    const show = attachRevisionPack(base, {
      clips: [
        { id: 'rev-ao', titulo: 'Presión alta', url_play: 'https://cdn.example/ao.mp4', status: 'hot', fase: 'ataque_organizado' },
        { id: 'dup', titulo: 'Duplicado', url: 'https://cdn.example/inline.mp4', status: 'hot', fase: 'ataque_organizado' },
        { id: 'cold', titulo: 'En drive', url_play: 'https://cdn.example/cold.mp4', status: 'en_drive', fase: 'ataque_organizado' },
        { id: 'once1', titulo: 'Delantero', url_play: 'https://cdn.example/once.mp4', status: 'hot', fase: 'once_probable' },
        { id: 'folder-abp', titulo: 'Córner', url_play: 'https://cdn.example/abp.mp4', status: 'hot' },
      ],
      folders: [{ id: 'f-abp', fase: 'abp_ofensiva' }],
      links: [
        { clip_id: 'folder-abp', folder_id: 'f-abp', slot_tipo: 'folder' },
      ],
    })
    const kinds = show.slides.map((slide) => `${slide.kind}:${'fase' in slide ? slide.fase : slide.kind}`)
    assert.deepEqual(kinds, [
      'portada:portada',
      'once:once',
      'video:once_probable',
      'fase:ataque_organizado',
      'video:ataque_organizado',
      'video:ataque_organizado',
      'fase:abp_ofensiva',
      'video:abp_ofensiva',
    ])
    assert.equal(show.slides[2].kind === 'video' && show.slides[2].title, 'Delantero')
    assert.equal(show.slides[5].kind === 'video' && show.slides[5].title, 'Presión alta')
    assert.equal(show.slides.some((slide) => slide.kind === 'video' && slide.title === 'Duplicado'), false)
    assert.equal(show.slides.some((slide) => slide.kind === 'video' && slide.title === 'En drive'), false)
  })

  it('strips board jpeg previews before sending the show over the sala', () => {
    const show = buildInformeShow({
      fases: [
        {
          fase: 'transicion_ofensiva',
          fortalezas: ['Sale'],
          debilidades: [],
          clips: [],
          pizarra_diagrama: {
            elements: [{ id: 'p1', type: 'player', position: { x: 10, y: 20 } }],
            arrows: [],
            zones: [],
            preview: 'data:image/jpeg;base64,HUGE',
          },
        },
      ],
    })
    const slim = slimShowForSync(show)
    assert.equal(slim.slides[1].kind === 'fase' && slim.slides[1].board?.preview, undefined)
    assert.equal(slim.slides[1].kind === 'fase' && slim.slides[1].boardSrc, undefined)
    assert.equal(slim.slides[1].kind === 'fase' && slim.slides[1].board?.elements?.length, 1)
  })

  it('concatenates informe then plan with unique chapter ids and two covers', () => {
    const informe = buildInformeShow(
      {
        estrategia: { notas: 'Presiona alto' },
        fases: [
          {
            fase: 'ataque_organizado',
            fortalezas: ['Sale por fuera'],
            debilidades: [],
            clips: [{ id: 'i1', titulo: 'Salida', url: 'https://cdn.example/i.mp4', fase: 'ataque_organizado', notas: '' }],
          },
        ],
      },
      { rivalNombre: 'Racing' }
    )
    const plan = buildPlanShow(
      {
        ataque_organizado: 'Por fuera',
        defensa_organizada: '',
        transicion_ofensiva: '',
        transicion_defensiva: '',
        abp_ofensiva: '',
        abp_defensiva: '',
        fases: [
          {
            fase: 'ataque_organizado',
            texto: 'Por fuera',
            clips: [{ id: 'p1', titulo: 'Nuestra salida', url: 'https://cdn.example/p.mp4', fase: 'ataque_organizado', notas: '' }],
          },
        ],
      },
      { rivalNombre: 'Racing' }
    )
    const charla = concatCharlaShow(informe, plan)
    assert.equal(charla.kind, 'charla')
    assert.equal(showPresenterLabel(charla.kind), 'Presentar Informe Rival y Plan de Partido')
    assert.equal(charla.slides[0].id, 'informe:portada')
    assert.equal(charla.slides[0].kind === 'portada' && charla.slides[0].section, 'informe')
    const planCover = charla.slides.find((slide) => slide.id === 'plan:portada')
    assert.equal(planCover?.kind, 'portada')
    assert.equal(planCover?.section, 'plan')
    const coverIndex = charla.slides.findIndex((slide) => slide.id === 'plan:portada')
    assert.ok(coverIndex > 0)
    assert.equal(
      charla.slides.slice(0, coverIndex).every((slide) => slide.section === 'informe'),
      true
    )
    assert.equal(
      charla.slides.slice(coverIndex).every((slide) => slide.section === 'plan'),
      true
    )
    const chapters = showChapters(charla.slides)
    const ids = chapters.map((chapter) => chapter.id)
    assert.equal(new Set(ids).size, ids.length)
    assert.equal(chapters[0].label, 'Informe Rival')
    const planChapter = chapters.find((chapter) => chapter.id === 'plan:portada')
    assert.equal(planChapter?.label, 'Plan de Partido')
    const rivalFase = chapters.find((chapter) => chapter.id === 'informe:fase:ataque_organizado')
    const planFase = chapters.find((chapter) => chapter.id === 'plan:fase:ataque_organizado')
    assert.equal(rivalFase?.label, 'Rival · Ataque organizado')
    assert.equal(planFase?.label, 'Plan · Ataque organizado')
    assert.equal(rivalFase?.videoCount, 1)
    assert.equal(planFase?.videoCount, 1)

    const packed = concatCharlaShow(
      attachRevisionPack(informe, {
        clips: [{ id: 'rev-i', titulo: 'Presión', url_play: 'https://cdn.example/rev-i.mp4', status: 'hot', fase: 'ataque_organizado' }],
      }),
      attachRevisionPack(plan, {
        clips: [{ id: 'rev-p', titulo: 'Nuestra presión', url_play: 'https://cdn.example/rev-p.mp4', status: 'hot', fase: 'ataque_organizado' }],
      })
    )
    const packedIds = packed.slides.map((slide) => slide.id)
    assert.equal(new Set(packedIds).size, packedIds.length)
    assert.equal(packed.slides.some((slide) => slide.id === 'informe:video:rev:rev-i'), true)
    assert.equal(packed.slides.some((slide) => slide.id === 'plan:video:rev:rev-p'), true)
  })
})
