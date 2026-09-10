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
})
