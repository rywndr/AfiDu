export function DoodleBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 bg-repeat opacity-10"
      style={{ backgroundImage: "url('/abstract_doodle.webp')", backgroundSize: '400px' }}
    />
  );
}
