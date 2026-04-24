function RightMainSide({ children }: { children: React.ReactNode }) {
  return (
    <section className="flex-1">
      <h1>User Right Side</h1>
      {children}
    </section>
  );
}

export default RightMainSide;
