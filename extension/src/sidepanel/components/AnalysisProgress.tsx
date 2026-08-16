import { useServerStore } from "@/store/serverStore";

export default function AnalysisProgress() {
  const { analysisSteps, analysisError } = useServerStore();

  const statusIcon = (status: string) => {
    switch (status) {
      case "done":
        return "✅";
      case "running":
        return "⏳";
      case "error":
        return "❌";
      default:
        return "⬜";
    }
  };

  return (
    <div className="flex flex-col gap-3 animate-fade-in">
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-discord-blurple animate-pulse-soft" />
          <h3 className="text-sm font-semibold text-text-primary">
            Analyzing Server…
          </h3>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1 bg-surface-500/30 rounded-full mb-4 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-discord-blurple to-discord-fuchsia rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${Math.max(
                10,
                (analysisSteps.filter((s) => s.status === "done").length /
                  Math.max(analysisSteps.length, 1)) *
                  100
              )}%`,
            }}
          />
        </div>

        {/* Steps */}
        <div className="flex flex-col gap-0.5">
          {analysisSteps.map((step) => (
            <div key={step.id} className="progress-step">
              <span className="text-sm flex-shrink-0">
                {statusIcon(step.status)}
              </span>
              <span
                className={`text-sm ${
                  step.status === "done"
                    ? "text-text-primary"
                    : step.status === "running"
                    ? "text-discord-blurple"
                    : step.status === "error"
                    ? "text-discord-red"
                    : "text-text-muted/50"
                }`}
              >
                {step.label}
              </span>
              {step.detail && (
                <span className="text-[10px] text-text-muted ml-auto">
                  {step.detail}
                </span>
              )}
            </div>
          ))}
        </div>

        {analysisError && (
          <div className="mt-3 px-3 py-2 rounded-lg bg-discord-red/10 border border-discord-red/20 text-xs text-discord-red">
            ⚠ {analysisError}
          </div>
        )}
      </div>

      {/* Blueprint generation message */}
      {analysisSteps.every((s) => s.status === "done") && (
        <div className="text-center py-3 animate-fade-in">
          <div className="text-xl mb-1">📐</div>
          <p className="text-xs text-text-muted">Generating blueprint…</p>
        </div>
      )}
    </div>
  );
}
