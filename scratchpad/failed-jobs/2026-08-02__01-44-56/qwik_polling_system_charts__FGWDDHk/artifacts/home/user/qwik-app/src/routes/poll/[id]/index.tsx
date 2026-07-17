import { component$, useStore, $ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { getPoll, getOptions } from "../../../db";

export const usePollData = routeLoader$(async (event) => {
  const pollId = event.params.id;
  const poll = getPoll(pollId);
  if (!poll) {
    event.status(404);
    event.send(404, "Poll not found");
    return null;
  }
  const options = getOptions(pollId);
  return { poll, options };
});

export default component$(() => {
  const data = usePollData().value;
  if (!data) return null;

  const state = useStore({
    options: data.options,
    errorMessage: "",
    successMessage: "",
  });

  const handleVote = $(async (optionId: number) => {
    state.errorMessage = "";
    state.successMessage = "";
    try {
      const response = await fetch(`/poll/${data.poll.id}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ optionId }),
      });

      const resData = await response.json();
      if (response.ok && resData.success) {
        state.options = state.options.map((opt) => ({
          ...opt,
          votes: resData.votes[opt.id.toString()] ?? opt.votes,
        }));
        state.successMessage = "Vote registered successfully!";
      } else {
        state.errorMessage = resData.error || "Failed to cast vote.";
      }
    } catch (err) {
      state.errorMessage = "Network error. Please try again.";
    }
  });

  const totalVotes = state.options.reduce((sum, opt) => sum + opt.votes, 0);

  return (
    <div style={{ maxWidth: "600px", margin: "40px auto", padding: "20px", fontFamily: "system-ui, sans-serif" }}>
      <h1 id="poll-question" style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "20px" }}>
        {data.poll.question}
      </h1>

      <div style={{ marginBottom: "30px", background: "#f9fafb", padding: "20px", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
        <svg id="poll-chart" width="500" height="300" style={{ background: "#ffffff", borderRadius: "4px" }}>
          {state.options.map((opt, i) => {
            const width = totalVotes > 0 ? (opt.votes / totalVotes) * 400 : 0;
            const y = i * 40 + 30;
            return (
              <g key={opt.id}>
                {/* Option text label inside SVG for better visual context */}
                <text x="10" y={y + 15} fill="#4b5563" font-size="12" font-weight="500">
                  {opt.text}
                </text>
                {/* Bar */}
                <rect
                  class="chart-bar"
                  data-option-id={opt.id}
                  x="10"
                  y={y + 20}
                  width={width}
                  height="15"
                  fill="#3b82f6"
                  rx="3"
                />
                {/* Vote Count */}
                <text
                  class="vote-count"
                  data-option-id={opt.id}
                  x={width + 20}
                  y={y + 32}
                  fill="#1f2937"
                  font-size="12"
                  font-weight="bold"
                >
                  {opt.votes}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {state.options.map((opt) => (
          <div
            key={opt.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 16px",
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
            }}
          >
            <span style={{ fontWeight: "500" }}>{opt.text}</span>
            <button
              class="vote-button"
              data-option-id={opt.id}
              onClick$={() => handleVote(opt.id)}
              style={{
                padding: "8px 16px",
                background: "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              Vote
            </button>
          </div>
        ))}
      </div>

      {state.successMessage && (
        <div style={{ marginTop: "20px", padding: "12px", background: "#d1fae5", color: "#065f46", borderRadius: "6px", fontWeight: "500" }}>
          {state.successMessage}
        </div>
      )}

      {state.errorMessage && (
        <div style={{ marginTop: "20px", padding: "12px", background: "#fee2e2", color: "#991b1b", borderRadius: "6px", fontWeight: "500" }}>
          {state.errorMessage}
        </div>
      )}
    </div>
  );
});

export const head: DocumentHead = {
  title: "Poll Results & Voting",
};
