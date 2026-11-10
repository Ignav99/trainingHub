const CARRILES = ['13,84 m', '11', '18,32', '11', '13,84']

function Campo() {
  return (
    <svg
      className="w-full max-w-[34rem] text-foreground"
      viewBox="-6 -6 692 537"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path
        d="M0 525V0h680v525M138.4 0v165h403.2V0M248.4 0v55h183.2V0M266.9 165a91.5 91.5 0 0 0 146.2 0M248.5 525a91.5 91.5 0 0 1 183 0M0 10A10 10 0 0 0 10 0M670 0a10 10 0 0 0 10 10M0 525h680"
        vectorEffect="non-scaling-stroke"
      />
      <path
        className="text-border"
        strokeDasharray="4 5"
        d="M138.4 165v360M248.4 55v470M431.6 55v470M541.6 165v360"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx="340" cy="110" r="3" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function PuertaCal({
  rotulo,
  titulo,
  children,
  pie,
}: {
  rotulo: string
  titulo: string
  children: React.ReactNode
  pie?: React.ReactNode
}) {
  return (
    <div
      className="puerta-cal min-h-screen bg-background text-foreground grid grid-cols-1 lg:grid-cols-carriles"
      data-cal-zona
    >
      <section className="border-b-[1.5px] border-line p-6 lg:col-span-3 lg:border-b-0 lg:border-r-[1.5px] lg:p-10 lg:flex lg:flex-col">
        <div>
          <p className="text-6xl lg:text-[clamp(4.5rem,11vw,10rem)] [font-stretch:75%] font-black leading-[0.82]">
            Kabin-e
          </p>
          <p className="mt-4 text-lg text-muted-foreground">La herramienta del cuerpo técnico.</p>
        </div>
        <div className="mt-auto hidden lg:block">
          <Campo />
          <div className="grid grid-cols-carriles max-w-[34rem] border-t-[1.5px] border-line font-mono text-xs text-muted-foreground">
            {CARRILES.map((c, i) => (
              <span key={i} className="pt-2">
                {c}
              </span>
            ))}
          </div>
        </div>
      </section>
      <main className="p-6 lg:col-span-2 lg:p-10 lg:flex lg:items-center">
        <div className="max-w-sm w-full">
          <p className="cal-rotulo text-muted-foreground">{rotulo}</p>
          <h1 className="cal-titulo text-3xl mt-1">{titulo}</h1>
          <div className="mt-8">{children}</div>
          {pie && <div className="mt-6 text-sm text-muted-foreground">{pie}</div>}
        </div>
      </main>
    </div>
  )
}
