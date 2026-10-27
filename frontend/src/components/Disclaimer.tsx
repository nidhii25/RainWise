export function Disclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <p className={`disclaimer ${compact ? "small" : ""}`}>
      These results are preliminary. They are calculated from published guidance
      (CPWD, IS 15797, CGWB) and stated assumptions, not from a site inspection by a
      qualified engineer. Confirm soil, water table, and structural design with a
      licensed professional before construction.
    </p>
  );
}
