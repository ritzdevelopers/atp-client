type RightMainSideProps = {
  children: React.ReactNode;
  containScroll?: boolean;
};

function RightMainSide({ children, containScroll = false }: RightMainSideProps) {
  const shell = containScroll
    ? "flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-slate-50 px-3 py-3 [font-family:var(--font-inter),system-ui,sans-serif] sm:px-5 sm:py-4 md:px-6 lg:px-8 lg:py-5"
    : "min-h-full w-full min-w-0 bg-slate-50 px-3 py-4 [font-family:var(--font-inter),system-ui,sans-serif] sm:px-5 sm:py-6 md:px-6 md:py-8 lg:px-10 lg:py-10";

  const inner = containScroll
    ? "flex h-full min-h-0 w-full min-w-0 max-w-full flex-col overflow-hidden"
    : "mx-auto w-full min-w-0 max-w-[min(100%,1880px)]";

  return (
    <div className={shell}>
      <div className={inner}>{children}</div>
    </div>
  );
}

export default RightMainSide;
