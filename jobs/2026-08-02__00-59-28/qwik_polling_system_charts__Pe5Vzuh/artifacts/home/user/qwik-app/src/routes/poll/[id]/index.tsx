import { component$, useSignal, $ } from "@builder.io/qwik";
import { routeLoader$, useLocation } from "@builder.io/qwik-city";
import { getPoll, getOptions, type Option } from "~/lib/db";

export const usePollData = routeLoader$(async ({ params, status }) => {
  const pollId = params.id;
  const poll = getPoll(pollId);

  if (!poll) {
    status(404);
    return { poll: null, options: [] };
  }

  const options = getOptions(pollId);
  return { poll, options };
});

export default component$(() => {
  const loc = useLocation();
  const pollId = loc.params.id;
  const signal = usePollData();
  const options = useSignal<Option[]>(signal.value.options);

  const totalVotes = options.value.reduce((sum, o) => sum + o.votes, 0);

  const handleVote = $(async (optionId: number) => {
    try {
      const response = await fetch(`/poll/${pollId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId }),
      });

      if (response.ok) {
        const data = await response.json();
        // Update the options with new vote counts
        const updatedOptions = options.value.map((opt) => ({
          ...opt,
          votes: data.votes[String(opt.id)] ?? opt.votes,
        }));
        options.value = updatedOptions;
      } else {
        const data = await response.json();
        if (response.status === 429) {
          alert("Please wait before voting again.");
        } else {
          alert(data.error || "An error occurred.");
        }
      }
    } catch (err) {
      alert("Network error. Please try again.");
    }
  });

  if (!signal.value.poll) {
    return <div>Poll not found</div>;
  }

  const { poll } = signal.value;

  const barHeight = 40;
  const barGap = 20;
  const chartWidth = 500;
  const chartHeight = 300;
  const maxBarWidth = 400;
  const leftMargin = 10;
  const topMargin = 20;

  return (
    <div>
      <h1 id="poll-question">{poll.question}</h1>

      <svg id="poll-chart" width={chartWidth} height={chartHeight}>
        {options.value.map((opt, index) => {
          const percentage = totalVotes > 0 ? (opt.votes / totalVotes) * 100 : 0;
          const barWidth = totalVotes > 0 ? Math.max((opt.votes / totalVotes) * maxBarWidth, opt.votes > 0 ? 2 : 0) : 0;
          const y = topMargin + index * (barHeight + barGap);

          return (
            <g key={opt.id}>
              <text
                x={leftMargin}
                y={y + barHeight / 2 + 5}
                fill="#333"
                font-size="14"
                font-family="sans-serif"
              >
                {opt.text}
              </text>
              <rect
                class="chart-bar"
                data-option-id={String(opt.id)}
                x={80}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={`hsl(${index * 60}, 70%, 50%)`}
                rx="4"
                ry="4"
              />
              <text
                class="vote-count"
                data-option-id={String(opt.id)}
                x={80 + barWidth + 5}
                y={y + barHeight / 2 + 5}
                fill="#333"
                font-size="14"
                font-family="sans-serif"
              >
                {opt.votes}
              </text>
            </g>
          );
        })}
      </svg>

      <div style="margin-top: 16px;">
        {options.value.map((opt) => (
          <button
            key={opt.id}
            class="vote-button"
            data-option-id={String(opt.id)}
            onClick$={() => handleVote(opt.id)}
            style="margin-right: 8px; padding: 8px 16px; cursor: pointer;"
          >
            Vote for {opt.text}
          </button>
        ))}
      </div>
    </div>
  );
});
