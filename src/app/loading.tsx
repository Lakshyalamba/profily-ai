import { AudioLines } from "lucide-react";
export default function Loading() {
  return (
    <div className="container route-loading">
      <span className="welcome-icon">
        <AudioLines size={24} />
      </span>
      <p role="status">Bringing your workspace into view…</p>
      <div className="loading-skeleton" aria-hidden="true">
        <span />
        <span />
        <div>
          <i />
          <i />
        </div>
      </div>
    </div>
  );
}
