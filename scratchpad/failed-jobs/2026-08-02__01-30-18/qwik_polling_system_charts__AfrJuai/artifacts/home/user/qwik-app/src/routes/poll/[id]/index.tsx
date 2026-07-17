import { component$, useStore, $ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { getPoll } from "../../../db";

export const usePollData = routeLoader$(async (event) => {
  const poll = getPoll(event.params.id);
  if (!poll) {
    event.status(404);
    return null;
  }
  return poll;
});

export default component$(() => {
  const pollSignal = usePollData();

  if (!pollSignal.value) {
    return (
      <div class="message message-error" style={{ margin: "2rem auto", maxWidth: "400px" }}>
        Poll not found
      </div>
    );
  }

  const poll = pollSignal.value;

  // Initialize store with the loader's data
  const state = useStore({
    options: poll.options.map((opt) => ({ ...opt })),
    errorMessage: "",
    successMessage: "",
    isVoting: false,
  });

  // Calculate total votes
  const totalVotes = state.options.reduce((sum, opt) => sum + opt.votes, 0);

  const handleVote = $(async (optionId: number) => {
    if (state.isVoting) return;
    state.isVoting = true;
    state.errorMessage = "";
    state.successMessage = "";

    try {
      const response = await fetch(`/poll/${poll.id}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ optionId }),
      });

      const data = await response.json();

      if (response.status === 200 && data.success) {
        // Update local state votes
        state.options.forEach((opt) => {
          const updatedVotes = data.votes[opt.id.toString()];
          if (updatedVotes !== undefined) {
            opt.votes = updatedVotes;
          }
        });
        state.successMessage = "Vote cast successfully!";
      } else {
        state.errorMessage = data.error || "Failed to cast vote.";
      }
    } catch {
      state.errorMessage = "An error occurred. Please try again.";
    } finally {
      state.isVoting = false;
    }
  });

  // SVG dimensions & layout calculations
  const svgWidth = 500;
  const svgHeight = 300;
  const numOptions = state.options.length;
  const rowHeight = Math.min(50, 260 / numOptions);
  const barHeight = rowHeight * 0.6;
  const startY = 30;

  return (
    <div class="poll-container">
      <h1 id="poll-question">{poll.question}</h1>

      <svg id="poll-chart" width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
        {state.options.map((option, i) => {
          const percentage = totalVotes > 0 ? option.votes / totalVotes : 0;
          const width = percentage * 400;
          const y = startY + i * rowHeight;

          return (
            <g key={option.id}>
              {/* Option label */}
              <text
                x="90"
                y={y + barHeight / 2}
                text-anchor="end"
                dominant-baseline="central"
                font-size="14"
                font-weight="bold"
                fill="#374151"
              >
                {option.text}
              </text>

              {/* Chart bar */}
              <rect
                class="chart-bar"
                data-option-id={option.id}
                x="100"
                y={y}
                width={width}
                height={barHeight}
                rx="4"
                fill="#3b82f6"
              />

              {/* Vote count */}
              <text
                class="vote-count"
                data-option-id={option.id}
                x={100 + width + 10}
                y={y + barHeight / 2}
                text-anchor="start"
                dominant-baseline="central"
                font-size="14"
                font-weight="bold"
                fill="#1f2937"
              >
                {option.votes}
              </text>
            </g>
          );
        })}
      </svg>

      <div class="vote-options">
        {state.options.map((option) => (
          <button
            key={option.id}
            class="vote-button"
            data-option-id={option.id}
            onClick$={() => handleVote(option.id)}
            disabled={state.isVoting}
          >
            Vote {option.text}
          </button>
        ))}
      </div>

      {state.errorMessage && (
        <div class="message message-error">{state.errorMessage}</div>
      )}
      {state.successMessage && (
        <div class="message message-success">{state.successMessage}</div>
      )}

      <div class="footer">
        <p>Powered by Qwik & SQLite</p>
      </div>
    </div>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const poll = resolveValue(usePollData);
  return {
    title: poll ? `Poll: ${poll.question}` : "Poll Not Found",
  };
};
