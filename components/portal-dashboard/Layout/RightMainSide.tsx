type RightMainSideProps = {
  children: React.ReactNode;
  containScroll?: boolean;
};

export type RightMainSideOrganization = {
  id: string | number;
  org_name?: string | null;
  org_email?: string | null;
  org_phone?: string | null;
  owner_name?: string | null;
  owner_email?: string | null;
  owner_phone?: string | null;
  owner_id?: string | number | null;
  created_at?: string | Date | null;
  owner_info: { name?: string | null; email?: string | null };
};

export type RightMainSideUser = {
  user_id: string | number;
  user_name?: string | null;
  user_email?: string | null;
  user_phone?: string | null;
  user_created_at?: string | Date | null;
  user_role_id?: string | number | null;
  user_role_name?: string | null;
};

function RightMainSide({ children, containScroll = false }: RightMainSideProps) {
  const shell = containScroll
    ? "flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-slate-50 px-3 py-3 [font-family:var(--font-inter),system-ui,sans-serif] sm:px-5 sm:py-4 md:px-6 lg:px-8 lg:py-5"
    : "min-h-screen w-full min-w-0 bg-slate-50 px-3 py-4 [font-family:var(--font-inter),system-ui,sans-serif] sm:px-5 sm:py-6 md:px-6 md:py-8 lg:px-10 lg:py-10";

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
