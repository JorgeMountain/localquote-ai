"use client";

import { useRouter } from "next/navigation";
import type { Business } from "@/lib/types";

export function BusinessSelectFilter({
  businesses,
  activeBusinessId,
  basePath,
  allLabel = "Todos los negocios",
}: {
  businesses: Business[];
  activeBusinessId?: string;
  basePath: string;
  allLabel?: string;
}) {
  const router = useRouter();

  if (businesses.length <= 1) return null;

  return (
    <label className="grid max-w-sm gap-2 text-sm font-semibold text-[#3b392f]">
      Negocio
      <select
        className="h-11 rounded-md border border-black/15 bg-white px-3 text-sm"
        value={activeBusinessId ?? ""}
        onChange={(event) => {
          const businessId = event.target.value;
          router.push(businessId ? `${basePath}?business=${businessId}` : basePath);
        }}
      >
        <option value="">{allLabel}</option>
        {businesses.map((business) => (
          <option key={business.id} value={business.id}>
            {business.name}
          </option>
        ))}
      </select>
    </label>
  );
}
