export function BotRulesEditor({ rules }: { rules: string[] }) {
  return (
    <label className="grid gap-2 text-sm font-semibold md:col-span-2">
      Instrucciones del bot
      <textarea
        className="min-h-32 rounded-lg border border-black/15 bg-[#f8f6f1] px-3 py-2 text-sm font-normal outline-none focus:border-black"
        name="rules"
        defaultValue={rules.join("\n")}
        maxLength={8000}
        required
      />
      <span className="text-xs font-normal leading-5 text-[#706d62]">
        Ejemplo: no confirmar citas sin validacion y no inventar precios ni enlaces.
      </span>
    </label>
  );
}
