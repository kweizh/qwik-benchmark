import { component$, useSignal, $ } from '@builder.io/qwik';
import { routeLoader$, type RequestHandler, useLocation } from '@builder.io/qwik-city';
import { getDb, buildCommentTree, type DbComment, type CommentResponse } from '../../../../lib/db';

export const useCommentsLoader = routeLoader$(async ({ params }) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM Comment WHERE postId = ? ORDER BY createdAt ASC').all(params.id) as DbComment[];
  return buildCommentTree(rows);
});

export const onGet: RequestHandler = async ({ params, request, json }) => {
  console.log('onGet called for', params.id);
  const accept = request.headers.get('accept') || '';
  if (accept.includes('application/json')) {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM Comment WHERE postId = ? ORDER BY createdAt ASC').all(params.id) as DbComment[];
    const tree = buildCommentTree(rows);
    json(200, tree);
  }
};

export const onPost: RequestHandler = async ({ params, request, json }) => {
  console.log('onPost called for', params.id);
  try {
    let body: any;
    try {
      body = await request.json();
      console.log('onPost body:', body);
    } catch (e) {
      console.error('onPost JSON parse error:', e);
      json(400, { error: 'Invalid JSON payload' });
      return;
    }

    const { parentId, text, author } = body;

    // Validate text and author
    if (typeof text !== 'string' || !text.trim()) {
      json(400, { error: 'Comment text is required' });
      return;
    }
    if (typeof author !== 'string' || !author.trim()) {
      json(400, { error: 'Author is required' });
      return;
    }

    const db = getDb();

    // Validate parentId if provided
    if (parentId !== null && parentId !== undefined) {
      const parentIdNum = Number(parentId);
      if (isNaN(parentIdNum)) {
        json(400, { error: 'Invalid parentId' });
        return;
      }
      const parentExists = db.prepare('SELECT 1 FROM Comment WHERE id = ?').get(parentIdNum);
      if (!parentExists) {
        json(404, { error: 'Parent comment not found' });
        return;
      }
    }

    // Insert comment
    const stmt = db.prepare(`
      INSERT INTO Comment (postId, parentId, text, author)
      VALUES (?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      params.id,
      parentId !== undefined && parentId !== null ? Number(parentId) : null,
      text.trim(),
      author.trim()
    );

    const newId = Number(result.lastInsertRowid);
    const newComment = db.prepare('SELECT * FROM Comment WHERE id = ?').get(newId) as DbComment;

    const formatted = {
      id: newComment.id,
      postId: newComment.postId,
      parentId: newComment.parentId,
      text: newComment.text,
      author: newComment.author,
      createdAt: newComment.createdAt.includes('T') 
        ? new Date(newComment.createdAt).toISOString()
        : new Date(newComment.createdAt + ' UTC').toISOString()
    };

    json(201, formatted);
  } catch (err: any) {
    console.error('onPost error:', err);
    json(500, { error: err.message || 'Internal Server Error' });
  }
};

export const CommentNode = component$<{
  comment: CommentResponse;
  postId: string;
  isTopLevel?: boolean;
}>(({ comment, postId, isTopLevel = false }) => {
  const showReplyForm = useSignal(false);
  const replyText = useSignal('');
  const replyAuthor = useSignal('');
  const errorMsg = useSignal('');

  const submitReply = $(async () => {
    if (!replyText.value.trim() || !replyAuthor.value.trim()) {
      errorMsg.value = 'Both name and comment are required.';
      return;
    }
    try {
      const res = await fetch(`/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parentId: comment.id,
          text: replyText.value,
          author: replyAuthor.value,
        }),
      });
      if (res.ok) {
        replyText.value = '';
        replyAuthor.value = '';
        showReplyForm.value = false;
        errorMsg.value = '';
        window.location.reload();
      } else {
        const data = await res.json();
        errorMsg.value = data.error || 'Failed to submit reply.';
      }
    } catch {
      errorMsg.value = 'An error occurred. Please try again.';
    }
  });

  const nodeStyle = isTopLevel
    ? {
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '16px',
        backgroundColor: 'white',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        marginTop: '20px'
      }
    : {
        marginLeft: '24px',
        borderLeft: '2px solid #e2e8f0',
        paddingLeft: '16px',
        marginTop: '16px'
      };

  return (
    <div class="comment-node" style={nodeStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontWeight: '600', color: '#1a202c' }}>{comment.author}</span>
        <span style={{ fontSize: '0.8em', color: '#718096' }}>{new Date(comment.createdAt).toLocaleString()}</span>
      </div>
      <div style={{ marginTop: '6px', color: '#2d3748', fontSize: '0.95em', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
        {comment.text}
      </div>
      <button 
        onClick$={() => { showReplyForm.value = !showReplyForm.value; }}
        style={{ 
          marginTop: '8px', 
          cursor: 'pointer', 
          background: 'none', 
          border: 'none', 
          color: '#3182ce', 
          fontWeight: '500',
          fontSize: '0.875em',
          padding: '0',
          textDecoration: 'underline' 
        }}
      >
        {showReplyForm.value ? 'Cancel' : 'Reply'}
      </button>

      {showReplyForm.value && (
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '500px', backgroundColor: '#f7fafc', padding: '12px', borderRadius: '6px', border: '1px solid #edf2f7' }}>
          <h4 style={{ margin: '0 0 4px 0', fontSize: '0.9em', color: '#4a5568' }}>Reply to {comment.author}</h4>
          <input
            type="text"
            placeholder="Your Name"
            value={replyAuthor.value}
            onInput$={(e) => { replyAuthor.value = (e.target as HTMLInputElement).value; }}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e0', fontSize: '0.9em' }}
          />
          <textarea
            placeholder="Write a reply..."
            value={replyText.value}
            onInput$={(e) => { replyText.value = (e.target as HTMLTextAreaElement).value; }}
            style={{ padding: '8px', minHeight: '60px', borderRadius: '4px', border: '1px solid #cbd5e0', fontSize: '0.9em', fontFamily: 'inherit' }}
          />
          {errorMsg.value && <div style={{ color: '#e53e3e', fontSize: '0.85em', fontWeight: '500' }}>{errorMsg.value}</div>}
          <button 
            onClick$={submitReply}
            style={{ 
              padding: '6px 12px', 
              alignSelf: 'flex-start', 
              cursor: 'pointer', 
              backgroundColor: '#3182ce', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              fontSize: '0.875em',
              fontWeight: '500'
            }}
          >
            Submit Reply
          </button>
        </div>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <div class="replies-container" style={{ marginTop: '8px' }}>
          {comment.replies.map((reply) => (
            <CommentNode key={reply.id} comment={reply} postId={postId} />
          ))}
        </div>
      )}
    </div>
  );
});

export default component$(() => {
  const commentsSignal = useCommentsLoader();
  const loc = useLocation();
  const postId = loc.params.id;

  const topAuthor = useSignal('');
  const topText = useSignal('');
  const errorMsg = useSignal('');

  const submitTopComment = $(async () => {
    if (!topText.value.trim() || !topAuthor.value.trim()) {
      errorMsg.value = 'Both name and comment are required.';
      return;
    }
    try {
      const res = await fetch(`/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parentId: null,
          text: topText.value,
          author: topAuthor.value,
        }),
      });
      if (res.ok) {
        topText.value = '';
        topAuthor.value = '';
        errorMsg.value = '';
        window.location.reload();
      } else {
        const data = await res.json();
        errorMsg.value = data.error || 'Failed to submit comment.';
      }
    } catch {
      errorMsg.value = 'An error occurred. Please try again.';
    }
  });

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', maxWidth: '800px', margin: '40px auto', padding: '0 20px', color: '#2d3748' }}>
      <header style={{ marginBottom: '32px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
        <h1 style={{ fontSize: '2em', fontWeight: '700', color: '#1a202c', margin: '0 0 8px 0' }}>Comments Thread</h1>
        <p style={{ color: '#718096', margin: '0' }}>Post ID: <strong style={{ color: '#4a5568' }}>{postId}</strong></p>
      </header>

      {/* Top level comment form */}
      <div style={{ marginBottom: '40px', padding: '24px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#fafbfe' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2em', color: '#2d3748' }}>Add a New Comment</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '600px' }}>
          <input
            type="text"
            placeholder="Your Name"
            value={topAuthor.value}
            onInput$={(e) => { topAuthor.value = (e.target as HTMLInputElement).value; }}
            style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '0.95em' }}
          />
          <textarea
            placeholder="Write a comment..."
            value={topText.value}
            onInput$={(e) => { topText.value = (e.target as HTMLTextAreaElement).value; }}
            style={{ padding: '10px', minHeight: '100px', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '0.95em', fontFamily: 'inherit' }}
          />
          {errorMsg.value && <div style={{ color: '#e53e3e', fontSize: '0.9em', fontWeight: '500' }}>{errorMsg.value}</div>}
          <button 
            onClick$={submitTopComment}
            style={{ 
              padding: '10px 20px', 
              alignSelf: 'flex-start', 
              cursor: 'pointer', 
              backgroundColor: '#3182ce', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px',
              fontSize: '0.95em',
              fontWeight: '600',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            Submit Comment
          </button>
        </div>
      </div>

      {/* List of comments */}
      <div>
        <h2 style={{ fontSize: '1.5em', fontWeight: '600', color: '#1a202c', marginBottom: '20px' }}>Discussion</h2>
        {commentsSignal.value.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f7fafc', borderRadius: '8px', border: '1px dashed #e2e8f0' }}>
            <p style={{ color: '#718096', margin: '0', fontSize: '1.1em' }}>No comments yet. Be the first to start the discussion!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {commentsSignal.value.map((comment) => (
              <CommentNode key={comment.id} comment={comment} postId={postId} isTopLevel={true} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
