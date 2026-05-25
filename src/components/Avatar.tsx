export function Avatar({ name, hue, online, size = 40 }: { name: string; hue: number; online?: boolean; size?: number }) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <div
        className="flex h-full w-full items-center justify-center rounded-full font-bold text-white shadow-card"
        style={{
          background: `linear-gradient(135deg, hsl(${hue} 80% 55%), hsl(${(hue + 40) % 360} 80% 60%))`,
          fontSize: size * 0.4,
        }}
      >
        {initials}
      </div>
      {online !== undefined && (
        <span
          className={`absolute bottom-0 right-0 block rounded-full ring-2 ring-card ${online ? "bg-emerald-500" : "bg-muted-foreground"}`}
          style={{ width: size * 0.28, height: size * 0.28 }}
        />
      )}
    </div>
  );
}
