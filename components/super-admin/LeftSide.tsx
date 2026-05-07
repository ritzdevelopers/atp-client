function LeftSide() {
    return (
        <div className="sticky top-0 h-screen w-64 border-r border-slate-200 bg-[#131C23] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                Super Admin
            </p>
            <h1 className="mt-2 text-lg font-bold text-white">Control Panel</h1>
            <p className="mt-3 text-sm text-slate-300">
                Manage global features and assign them to organizations.
            </p>
        </div>
    )
}

export default LeftSide;