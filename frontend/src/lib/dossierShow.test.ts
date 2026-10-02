import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildDirectoPlaylist,
  buildDirectoShow,
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

    const long = 'El rival sale por fuera con el lateral y el interior llega al segundo palo sin perder el centro'
    const full = buildInformeShow(
      { fases: [{ fase: 'ataque_organizado', fortalezas: [long], debilidades: [], clips: [] }] },
      { rivalNombre: 'Racing' }
    )
    const fase = full.slides.find((slide) => slide.kind === 'fase')
    assert.equal(fase && fase.kind === 'fase' && fase.fortalezas?.[0], long)
    assert.equal(fase && fase.kind === 'fase' && fase.bullets.includes(long), false)
    const many = Array.from({ length: 8 }, (_, i) => `Idea ${i + 1} del informe`)
    const all = buildInformeShow(
      { fases: [{ fase: 'ataque_organizado', fortalezas: many, debilidades: [], clips: [] }] },
      { rivalNombre: 'Racing' }
    )
    const allFase = all.slides.find((slide) => slide.kind === 'fase')
    assert.deepEqual(allFase && allFase.kind === 'fase' ? allFase.fortalezas : [], many)

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

  it('splits organized attack into a general slide and one slide per phase', () => {
    const creacion = { elements: [{ id: 'c' }] }
    const progresion = { elements: [{ id: 'p' }] }
    const finalizacion = { elements: [{ id: 'f' }] }
    const show = buildInformeShow({
      fases: [
        {
          fase: 'ataque_organizado',
          comentario_general: 'Salen en 4-3-3 y fijan al lateral.',
          fortalezas: ['Idea vieja de la fase'],
          debilidades: [],
          clips: [
            { id: 'c1', titulo: 'Salida', url: 'https://cdn.example/salida.mp4', fase: 'ataque_organizado', notas: '' },
          ],
          subfases: {
            finalizacion: {
              notas: 'Centro al segundo palo',
              fortalezas: ['Segundos palos'],
              debilidades: ['Poco centro'],
              pizarra_diagrama: finalizacion,
            },
            creacion: {
              notas: 'Portero más dos',
              fortalezas: ['Amplitud'],
              debilidades: ['Lento'],
              pizarra_diagrama: creacion,
            },
            progresion: {
              notas: 'Interior al carril',
              fortalezas: ['Tercer hombre'],
              debilidades: ['Pérdida interior'],
              pizarra_diagrama: progresion,
            },
          },
        },
      ],
    })
    const fases = show.slides.filter((slide) => slide.kind === 'fase')
    assert.deepEqual(
      fases.map((slide) => slide.title),
      ['Ataque organizado', 'Creación', 'Progresión', 'Finalización']
    )
    assert.equal(fases[0].kind === 'fase' && fases[0].bullets[0], 'Salen en 4-3-3 y fijan al lateral.')
    assert.equal(fases[0].kind === 'fase' && fases[0].board, undefined)
    assert.equal(fases[0].kind === 'fase' && fases[0].bullets.includes('Idea vieja de la fase'), false)
    assert.equal(fases[1].kind === 'fase' && fases[1].bullets[0], 'Portero más dos')
    assert.deepEqual(fases[1].kind === 'fase' ? fases[1].fortalezas : [], ['Amplitud'])
    assert.deepEqual(fases[1].kind === 'fase' ? fases[1].debilidades : [], ['Lento'])
    assert.equal(fases[0].kind === 'fase' && (fases[0].fortalezas?.length ?? 0), 0)
    assert.equal(fases[1].kind === 'fase' && fases[1].board, creacion)
    assert.equal(fases[2].kind === 'fase' && fases[2].board, progresion)
    assert.equal(fases[3].kind === 'fase' && fases[3].board, finalizacion)
    assert.equal(show.slides.at(-1)?.kind, 'video')
    assert.equal(show.slides.at(-1)?.kind === 'video' && show.slides.at(-1)?.title, 'Salida')

    const plan = buildPlanShow({
      ataque_organizado: '',
      defensa_organizada: '',
      transicion_ofensiva: '',
      transicion_defensiva: '',
      abp_ofensiva: '',
      abp_defensiva: '',
      fases: [
        {
          fase: 'defensa_organizada',
          comentario_general: 'Bloque que bascula tarde.',
          clips: [],
          subfases: {
            bloque_bajo: {
              notas: 'Cinco atrás',
              fortalezas: ['Cierre de área'],
              debilidades: ['Espalda del lateral'],
              pizarra_diagrama: { elements: [{ id: 'bajo' }] },
            },
            bloque_alto: { notas: 'Presionan al portero', fortalezas: [], debilidades: [] },
            bloque_medio: { notas: 'Saltan al interior', fortalezas: [], debilidades: [] },
          },
        },
      ],
    })
    const defensa = plan.slides.filter((slide) => slide.kind === 'fase')
    assert.deepEqual(
      defensa.map((slide) => slide.title),
      ['Defensa organizada', 'Bloque alto', 'Bloque Mixto', 'Bloque bajo']
    )
    assert.deepEqual(defensa[3].kind === 'fase' ? defensa[3].fortalezas : [], [])
    assert.deepEqual(defensa[3].kind === 'fase' ? defensa[3].debilidades : [], [])
    const chapters = showChapters(show.slides)
    const ataque = chapters.find((chapter) => chapter.id === 'fase:ataque_organizado')
    assert.equal(ataque?.label, 'Ataque organizado')
    assert.equal(ataque?.slideCount, 5)
    assert.equal(ataque?.videoCount, 1)
    assert.equal(chapters.some((chapter) => chapter.label.includes('Finalización') || chapter.label.includes('Creación')), false)
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

  it('builds a one-clip live annotator show', () => {
    const show = buildDirectoShow('Motilla vs Herrera.mp4', 'blob:http://localhost/abc')
    assert.equal(show.kind, 'informe')
    assert.equal(show.slides.length, 1)
    const slide = show.slides[0]
    assert.equal(slide?.kind, 'video')
    if (slide?.kind !== 'video') return
    assert.equal(slide.id, 'video:directo')
    assert.equal(slide.kicker, 'En directo')
    assert.equal(slide.title, 'Motilla vs Herrera')
    assert.equal(slide.src, 'blob:http://localhost/abc')
    assert.equal(slide.clipId, 'directo')
    assert.equal(slide.fase, 'ataque_organizado')
    const blank = buildDirectoShow('  ', 'blob:x').slides[0]
    assert.equal(blank?.kind, 'video')
    if (blank?.kind === 'video') assert.equal(blank.title, 'Vídeo')
  })

  it('builds a playlist and strips local urls before syncing the tablet', () => {
    const show = buildDirectoPlaylist([
      { title: 'Primer tiempo.mp4', src: 'blob:http://localhost/a' },
      { title: 'Segundo.mov', src: 'blob:http://localhost/b' },
    ])
    assert.equal(show.slides.length, 2)
    const first = show.slides[0]
    const second = show.slides[1]
    assert.equal(first?.kind, 'video')
    assert.equal(second?.kind, 'video')
    if (first?.kind !== 'video' || second?.kind !== 'video') return
    assert.equal(first.id, 'video:directo:0')
    assert.equal(first.clipId, 'directo-0')
    assert.equal(first.title, 'Primer tiempo')
    assert.equal(second.clipId, 'directo-1')
    assert.equal(second.title, 'Segundo')
    const slim = slimShowForSync(show)
    const slimFirst = slim.slides[0]
    const slimSecond = slim.slides[1]
    assert.equal(slimFirst?.kind, 'video')
    assert.equal(slimSecond?.kind, 'video')
    if (slimFirst?.kind === 'video') assert.equal(slimFirst.src, '')
    if (slimSecond?.kind === 'video') assert.equal(slimSecond.src, '')
    assert.equal(slimFirst?.kind === 'video' ? slimFirst.title : '', 'Primer tiempo')
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
            { nombre: 'García', dorsal: 10, apariciones: 8, rol: 'interior', comentario: 'llega tarde', atributos: { bombilla: true } },
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
    const withIntel = buildInformeShow(
      { estrategia: { sistema: '4-3-3', once_probable: { actas_analizadas: 1, jugadores: [{ nombre: 'López', apariciones: 1 }], colocacion: { DC: 'López' } } } },
      { intelLines: ['Clasificación: 3º · 21 pts'] },
    )
    assert.equal(withIntel.slides[1]?.kind, 'contexto')
    assert.equal(withIntel.slides[1]?.kind === 'contexto' && withIntel.slides[1].bullets[0], 'Clasificación: 3º · 21 pts')
    assert.equal(withIntel.slides[2]?.kind, 'once')
    assert.equal(show.slides[2].kind === 'once' && show.slides[2].sistema, '4-3-3')
    assert.equal(
      show.slides[2].kind === 'once' && show.slides[2].bullets.some((b) => b.includes('llega tarde')),
      false
    )
    assert.equal(
      show.slides[2].kind === 'once' && show.slides[2].jugadores?.some((j) => j.nombre === 'García' && j.atributos?.bombilla),
      true
    )
    assert.equal(
      show.slides[2].kind === 'once' && show.slides[2].bullets.some((b) => b.includes('López')),
      false
    )
  })

  it('splits charts from the rival comment when intel is visual', () => {
    const show = buildInformeShow(
      { estrategia: { notas: 'Presiona alto', dimensiones_campo: '105 x 68' } },
      {
        intelVisual: {
          posicion: 3,
          puntos: 21,
          charts: [{ label: 'Casa', gf: 10, gc: 2 }],
          resultados: [{ local: 'Racing', visitante: 'Otro', golesLocal: 2, golesVisitante: 1 }],
          goleadores: [{ nombre: 'García', goles: 4 }],
          sancionados: [],
          apercibidos: [],
        },
      },
    )
    assert.deepEqual(
      show.slides.map((slide) => (slide.kind === 'contexto' ? slide.title : slide.kind)),
      ['portada', 'Contexto', 'Comentario del rival'],
    )
    assert.equal(show.slides[1].kind === 'contexto' && show.slides[1].bullets.length, 0)
    assert.equal(show.slides[1].kind === 'contexto' && show.slides[1].visual?.charts[0]?.label, 'Casa')
    assert.equal(show.slides[1].kind === 'contexto' && show.slides[1].visual?.resultados[0]?.golesLocal, 2)
    assert.equal(show.slides[2].kind === 'contexto' && show.slides[2].bullets[0], 'Presiona alto')
    assert.equal(show.slides[2].kind === 'contexto' && show.slides[2].bullets.includes('Campo 105 x 68'), true)
    const chapters = showChapters(show.slides)
    assert.deepEqual(chapters.map((chapter) => chapter.label), ['Inicio', 'Contexto', 'Comentario del rival'])
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

  it('keeps nutrition and defensive set pieces out of the plan until they are switched on', () => {
    const base = {
      ataque_organizado: '',
      defensa_organizada: '',
      transicion_ofensiva: '',
      transicion_defensiva: '',
      abp_ofensiva: '',
      abp_defensiva: 'Presión al sacador',
      fases: [
        {
          fase: 'abp_ofensiva' as const,
          clips: [],
          jugadas_abp: [{ jugada_id: 'corner-1', comentario: 'Segundo palo', orden: 0 }],
          estructuras_rival: [
            {
              id: 'est-1',
              titulo: 'Córner',
              notas: 'Cinco en zona',
              pizarra_diagrama: { elements: [{ id: 'rival' }] },
            },
          ],
        },
        {
          fase: 'abp_defensiva' as const,
          texto: 'Salida al primer palo',
          clips: [],
        },
      ],
      nutricion_partido: { notas: 'Gel en el minuto 70' },
    }
    const off = buildPlanShow({ ...base, incluir_nutricion: false, incluir_abp_defensiva: false })
    const titlesOff = off.slides.map((slide) => slide.title)
    assert.equal(titlesOff.includes('ABP defensiva'), false)
    assert.equal(titlesOff.includes('Nutrición'), false)
    assert.equal(titlesOff.includes('Córner'), true)
    assert.equal(titlesOff.includes('ABP ofensiva'), true)

    const on = buildPlanShow({ ...base, incluir_nutricion: true, incluir_abp_defensiva: true })
    const titlesOn = on.slides.map((slide) => slide.title)
    assert.equal(titlesOn.includes('ABP defensiva'), true)
    assert.equal(titlesOn.includes('Nutrición'), true)
    const corner = on.slides.find((slide) => slide.title === 'Córner')
    assert.equal(corner?.kind === 'fase' && corner.bullets[0], 'Cinco en zona')
    assert.equal(corner?.kind === 'fase' && Boolean(corner.board), true)
  })
})
