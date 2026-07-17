import { component$, useStore, $ } from '@builder.io/qwik';
import { routeLoader$, useLocation } from '@builder.io/qwik-city';
import { db } from '~/lib/db';

export const usePollData = routeLoader$(async ({ params, error }) => {
  const pollId = params.id;
  const poll = db.prepare('SELECT * FROM polls WHERE id = ?').get(pollId) as { id: string; question: string } | undefined;
  if (!poll) {
    throw error(404, 'Poll not found');
  }
  const options = db.prepare('SELECT * FROM options WHERE poll_id = ?').all() as { id: number; poll_id: string; text: string; votes: number }[];
  return { poll, options };
});

interface PollState {
  votes: Record<string, number>;
  errorMsg: string | null;
  isVoting: boolean;
}

export default component$(() => {
  const pollData = usePollData();
  const loc = useLocation();
  const pollId = loc.params.id;

  const state = useStore<PollState>(() => {
    const initialVotes: Record<string, number> = {};
    for (const opt of pollData.value.options) {
      initialVotes[String(opt.id)] = opt.votes;
    }
    return {
      votes: initialVotes,
      errorMsg: null,
      isVoting: false,
    };
  });

  const totalVotes = Object.values(state.votes).reduce((sum, count) => sum + count, 0);

  const handleVote$ = $(async (optionId: number) => {
    if (state.isVoting) return;
    state.errorMsg = null;
    state.isVoting = true;

    try {
      const response = await fetch(`/poll/${pollId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ optionId }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        state.votes = { ...data.votes };
      } else {
        state.errorMsg = data.error || 'An error occurred while voting';
      }
    } catch (err) {
      state.errorMsg = 'Failed to connect to the server';
    } finally {
      state.isVoting = false;
    }
  });

  return (
    <div class="poll-wrapper">
      <div class="poll-card">
        <h1 id="poll-question" class="poll-title">
          {pollData.value.poll.question}
        </h1>

        <div class="chart-container">
          <svg id="poll-chart" width="500" height="300" viewBox="0 0 500 300" class="poll-svg">
            {pollData.value.options.map((opt, idx) => {
              const votes = state.votes[String(opt.id)] || 0;
              const percentage = totalVotes > 0 ? votes / totalVotes : 0;
              const width = percentage * 400;
              const yBar = 40 + idx * 70;
              const yText = yBar - 8;

              return (
                <g key={opt.id}>
                  {/* Option text */}
                  <text
                    x="10"
                    y={yText}
                    class="option-label"
                  >
                    {opt.text}
                  </text>
                  {/* Bar background */}
                  <rect
                    x="10"
                    y={yBar}
                    width="400"
                    height="16"
                    class="bar-bg"
                  />
                  {/* The actual chart-bar */}
                  <rect
                    class="chart-bar"
                    data-option-id={opt.id}
                    x="10"
                    y={yBar}
                    width={width}
                    height="16"
                  />
                  {/* Vote count text */}
                  <text
                    class="vote-count"
                    data-option-id={opt.id}
                    x={10 + width + 10}
                    y={yBar + 13}
                  >
                    {votes}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {state.errorMsg && (
          <div class="error-banner">
            {state.errorMsg}
          </div>
        )}

        <div class="buttons-grid">
          {pollData.value.options.map((opt) => (
            <button
              key={opt.id}
              class="vote-button"
              data-option-id={opt.id}
              disabled={state.isVoting}
              onClick$={() => handleVote$(opt.id)}
            >
              Vote for {opt.text}
            </button>
          ))}
        </div>
      </div>

      <style>{`
        .poll-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 80vh;
          padding: 20px;
          background-color: #f1f5f9;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        }
        .poll-card {
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
          padding: 32px;
          max-width: 560px;
          width: 100%;
        }
        .poll-title {
          font-size: 24px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 24px;
          text-align: center;
        }
        .chart-container {
          display: flex;
          justify-content: center;
          margin-bottom: 24px;
        }
        .poll-svg {
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }
        .option-label {
          fill: #1e293b;
          font-size: 14px;
          font-weight: 600;
        }
        .bar-bg {
          fill: #e2e8f0;
          rx: 8px;
        }
        .chart-bar {
          fill: #3b82f6;
          rx: 8px;
          transition: width 0.3s ease-in-out;
        }
        .vote-count {
          fill: #475569;
          font-size: 14px;
          font-weight: 700;
        }
        .error-banner {
          background-color: #fef2f2;
          border: 1px solid #fca5a5;
          color: #991b1b;
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 20px;
          font-size: 14px;
          font-weight: 500;
          text-align: center;
        }
        .buttons-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 12px;
          margin-top: 16px;
        }
        .vote-button {
          background-color: #3b82f6;
          color: #ffffff;
          border: none;
          padding: 12px 16px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }
        .vote-button:hover:not(:disabled) {
          background-color: #2563eb;
        }
        .vote-button:disabled {
          background-color: #94a3b8;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
});
