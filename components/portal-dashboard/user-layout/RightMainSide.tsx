function RightMainSide({
  children,
  containScroll = false,
}: {
  children: React.ReactNode;
  containScroll?: boolean;
}) {
  if (!containScroll) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden px-3 py-3 sm:px-5 sm:py-4 md:px-6 lg:px-8 lg:py-5">
      <div className="flex h-full min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}

export default RightMainSide;
