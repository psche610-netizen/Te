export function OrientationGate({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="fixed inset-0 hidden portrait:flex safe-area flex-col items-center justify-center gap-8 bg-ink px-8 text-center z-50">
        <div aria-hidden="true" className="relative h-24 w-14 border border-bone">
          <div className="absolute inset-x-0 bottom-2 mx-auto h-px w-4 bg-bone" />
          <div className="absolute -right-10 top-1/2 h-px w-6 -translate-y-1/2 bg-signal" />
        </div>
        <div className="flex flex-col gap-3">
          <p className="text-xs tracking-label text-concrete">FACILITY 07</p>
          <h1 className="font-display text-5xl leading-none text-bone">ROTATE DEVICE</h1>
          <p className="text-xs tracking-label text-concrete">LANDSCAPE REQUIRED</p>
        </div>
      </div>
      <div className="contents portrait:hidden">{children}</div>
    </>
  )
}
