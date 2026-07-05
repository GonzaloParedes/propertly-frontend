export default function FloatingBlobs({ dark = false }: { dark?: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div
        className="blob blob-float"
        style={{
          width: 600,
          height: 600,
          top: "-160px",
          left: "-5%",
          background: dark
            ? "rgba(167, 154, 240, 0.35)"
            : "rgba(91, 75, 196, 0.18)",
        }}
      />
      <div
        className="blob blob-float2"
        style={{
          width: 450,
          height: 450,
          top: "20px",
          right: "-5%",
          background: dark
            ? "rgba(91, 75, 196, 0.30)"
            : "rgba(167, 154, 240, 0.15)",
        }}
      />
      <div
        className="blob blob-float3"
        style={{
          width: 320,
          height: 320,
          bottom: "-80px",
          right: "25%",
          background: dark
            ? "rgba(219, 76, 142, 0.22)"
            : "rgba(219, 76, 142, 0.10)",
        }}
      />
    </div>
  );
}
