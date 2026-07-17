import { component$, useStore, $, useTask$ } from '@builder.io/qwik';
import { routeLoader$ } from '@builder.io/qwik-city';
import { getDb } from '../../../lib/db.server';

export const usePollData = routeLoader$(async (event) => {
  const pollId = event.params.id;
  const db = getDb();

  // 1. Fetch poll
  const poll = db.prepare('SELECT * FROM polls WHERE id = ?').get(pollId) as { id: string; question: string } | undefined;
  if (!poll) {
    throw event.text(404, 'Poll not found');
  }

  // 2. Fetch options
  const options = db.prepare('SELECT * FROM options WHERE poll_id = ?').all(pollId) as {
    id: number;
    poll_id: string;
    text: string;
    votes: number;
  }[];

  return {
    poll,
    options,
  };
});

export default component$(() => {
  const pollData = usePollData();

  const state = useStore({
    options: pollData.value.options,
    error: '',
  });

  useTask$(({ track }) => {
    track(() => pollData.value);
    state.options = pollData.value.options;
    state.error = '';
  });

  const handleVote = $(async (optionId: number) => {
    state.error = '';
    try {
      const response = await fetch(`/poll/${pollData.value.poll.id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ optionId }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        state.options = state.options.map((opt) => ({
          ...opt,
          votes: data.votes[String(opt.id)] ?? opt.votes,
        }));
      } else {
        state.error = data.error || 'Failed to cast vote';
      }
    } catch (err: any) {
      state.error = 'An error occurred while voting.';
    }
  });

  const totalVotes = state.options.reduce((sum, opt) => sum + opt.votes, 0);

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '0 20px', fontFamily: 'sans-serif' }}>
      <h1 id="poll-question" style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
        {pollData.value.poll.question}
      </h1>

      <div style={{ marginBottom: '30px' }}>
        <svg id="poll-chart" width="500" height="300" style={{ background: '#f9f9f9', borderRadius: '8px', border: '1px solid #eee' }}>
          {state.options.map((option, index) => {
            const percentage = totalVotes > 0 ? option.votes / totalVotes : 0;
            const width = percentage * 400;
            const barHeight = 24;
            const spacing = 45;
            const startY = 40;
            const y = startY + index * spacing;

            return (
              <g key={option.id}>
                {/* Option Label inside SVG */}
                <text
                  x="15"
                  y={y - 6}
                  style={{ fontSize: '12px', fill: '#555', fontWeight: 'bold' }}
                >
                  {option.text}
                </text>
                {/* Bar */}
                <rect
                  class="chart-bar"
                  data-option-id={option.id}
                  x="15"
                  y={y}
                  width={width}
                  height={barHeight}
                  fill="#3b82f6"
                  rx="4"
                  style={{ transition: 'width 0.3s ease' }}
                />
                {/* Vote Count */}
                <text
                  class="vote-count"
                  data-option-id={option.id}
                  x={15 + width + 8}
                  y={y + barHeight / 2 + 4}
                  style={{ fontSize: '12px', fill: '#333', fontWeight: 'bold' }}
                >
                  {option.votes}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {state.error && (
        <div id="error-message" style={{ color: '#ef4444', backgroundColor: '#fee2e2', padding: '10px 15px', borderRadius: '6px', marginBottom: '20px', fontSize: '14px' }}>
          {state.error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {state.options.map((option) => (
          <button
            key={option.id}
            class="vote-button"
            data-option-id={option.id}
            onClick$={() => handleVote(option.id)}
            style={{
              padding: '12px 20px',
              fontSize: '16px',
              fontWeight: '500',
              color: '#fff',
              backgroundColor: '#2563eb',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              textAlign: 'left',
            }}
          >
            Vote for {option.text}
          </button>
        ))}
      </div>
    </div>
  );
});
