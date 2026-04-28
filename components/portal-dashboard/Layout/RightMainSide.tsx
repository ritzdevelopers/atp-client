type RightMainSideProps = {
  children: React.ReactNode;
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

function RightMainSide({ children }: RightMainSideProps) {
  const shell =
    "min-h-screen bg-slate-50 p-6 [font-family:var(--font-inter),system-ui,sans-serif] md:p-10";

  return (
    <div className={shell}>
      <div className="mx-auto max-w-6xl">{children}</div>
    </div>
  );
}

export default RightMainSide;
