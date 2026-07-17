import { component$, useStore } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { getOptions, getPoll } from "~/lib/db";

interface OptionData {
  id: number;
  text: string;
  votes: number;
}

type PollLoaderData =
  | {
      found: true;
      pollId: string;
      question: string;
      options: OptionData[];
    }
  | {
      found: false;
      pollId: string;
    };

export const usePollLoader = routeLoader$<PollLoaderData>((requestEvent) => {
  const pollId = requestEvent.params.id;
  const poll = getPoll(pollId);

  if (!poll) {
    requestEvent.status(404);
    return { found: false, pollId };
  }

  const options = getOptions(pollId).map((o) => ({
    id: o.id,
    text: o.text,
    votes: o.votes,
  }));

  return {
    found: true,
    pollId,
    question: poll.question,
    options,
  };
});

const CHART_WIDTH = 500;
const CHART_HEIGHT = 300;
const MAX_BAR_WIDTH = 400;
const CHART_LEFT = 90;
const BAR_HEIGHT = 28;
const BAR_GAP = 16;

export default component$(() => {
  const data = usePollLoader();

  const state = useStore<{ votes: Record<number, number>; error: string }>(
    {
      votes: data.value.found
        ? Object.fromEntries(data.value.options.map((o) => [o.id, o.votes]))
        : {},
      error: "",
    },
  );

  if (!data.value.found) {
    return (
      <div>
        <h1>Poll not found</h1>
        <p>No poll exists with id "{data.value.pollId}".</p>
      </div>
    );
  }

  const pollId = data.value.pollId;
  const options = data.value.options;
  const totalVotes = Object.values(state.votes).reduce(
    (sum, v) => sum + v,
    0,
  );

  return (
    <div class="poll-page">
      <h1 id="poll-question">{data.value.question}</h1>

      <svg
        id="poll-chart"
        width={CHART_WIDTH}
        height={CHART_HEIGHT}
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      >
        {options.map((option, i) => {
          const votes = state.votes[option.id] ?? 0;
          const total = Object.values(state.votes).reduce(
            (sum, v) => sum + v,
            0,
          );
          const width = total > 0 ? (votes / total) * MAX_BAR_WIDTH : 0;
          const y = 10 + i * (BAR_HEIGHT + BAR_GAP);

          return (
            <g key={option.id}>
              <text
                x={0}
                y={y + BAR_HEIGHT * 0.7}
                class="option-label"
                font-size="14"
              >
                {option.text}
              </text>
              <rect
                class="chart-bar"
                data-option-id={option.id}
                x={CHART_LEFT}
                y={y}
                width={width}
                height={BAR_HEIGHT}
                fill="#4f46e5"
              />
              <text
                class="vote-count"
                data-option-id={option.id}
                x={CHART_LEFT + width + 8}
                y={y + BAR_HEIGHT * 0.7}
                font-size="14"
              >
                {votes}
              </text>
            </g>
          );
        })}
      </svg>

      <p>Total votes: {totalVotes}</p>

      <div class="vote-buttons">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            class="vote-button"
            data-option-id={option.id}
            onClick$={async () => {
              state.error = "";
              try {
                const res = await fetch(`/poll/${pollId}/vote`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ optionId: option.id }),
                });
                const body = await res.json();
                if (!res.ok) {
                  state.error =
                    (body && body.error) || "Something went wrong";
                  return;
                }
                const votes = body.votes as Record<string, number>;
                for (const key of Object.keys(votes)) {
                  state.votes[Number(key)] = votes[key];
                }
              } catch {
                state.error = "Network error, please try again.";
              }
            }}
          >
            Vote for {option.text}
          </button>
        ))}
      </div>

      {state.error && <p class="error">{state.error}</p>}
    </div>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(usePollLoader);
  return {
    title: data.found ? data.question : "Poll not found",
  };
};
