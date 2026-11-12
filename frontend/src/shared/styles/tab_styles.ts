export function workspace_tab_style(active: boolean) {
    return `flex min-h-11 items-center gap-2 rounded-t-md px-3 text-sm focus-visible:outline-2 focus-visible:outline-[#1d4ed8] ${active ? "bg-[#152e45] font-semibold text-white" : "bg-[#f3f6f9] text-slate-700 hover:bg-slate-200"}`;
}
