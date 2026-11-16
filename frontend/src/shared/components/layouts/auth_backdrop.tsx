import type { ReactNode } from "react";
import { Link } from "react-router";
import login_plane from "../../../assets/login_plane.png";

export default function AuthBackdrop({ children, brand_to }: { children: ReactNode; brand_to?: string }) {
    return (
        <main className="relative isolate grid min-h-dvh grid-rows-[auto_1fr] bg-[#0b2238] text-white">
            <img src={login_plane} alt="" aria-hidden="true"
                className="pointer-events-none absolute inset-0 -z-20 size-full object-cover object-[43%_center]" />
            <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[#0b2238]/40" />
            <div aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-b from-[#0b2238]/85 via-transparent to-[#0b2238]/90" />
            <div className="mx-auto flex w-full max-w-[1600px] items-start px-5 pt-6 sm:px-9 sm:pt-9 lg:px-14 lg:pt-10">
                <div>
                    {brand_to ? (
                        <Link to={brand_to} className="rounded-sm text-2xl leading-none font-bold tracking-tight focus-visible:outline-2 focus-visible:outline-white">CISTRS</Link>
                    ) : <p className="text-2xl leading-none font-bold tracking-tight">CISTRS</p>}
                    <p className="mt-2 text-xs font-medium text-white/80">Shuttle Air Services, Inc.</p>
                </div>
            </div>
            {children}
        </main>
    );
}
