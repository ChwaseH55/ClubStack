import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';

export default function PollWidget({ poll }) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [votes, setVotes] = useState([]);
  const [myChoices, setMyChoices] = useState(null);
  const [selected, setSelected] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [totalVoters, setTotalVoters] = useState(0);

  const fetchVotes = useCallback(async () => {
    const { data } = await supabase.from('poll_votes').select('user_id, choices').eq('poll_id', poll.id);
    if (!data) return;
    setTotalVoters(data.length);
    let mine = null;
    const tally = {};
    data.forEach(v => {
      if (v.user_id === user.id) mine = v.choices;
      (v.choices ?? []).forEach(c => { tally[c] = (tally[c] ?? 0) + 1; });
    });
    setVotes(tally);
    setMyChoices(mine);
    if (mine) setSelected(mine);
  }, [poll.id, user.id]);

  useEffect(() => { fetchVotes(); }, [fetchVotes]);

  const isExpired = poll.ends_at && new Date(poll.ends_at) < new Date();
  const hasVoted = myChoices !== null;
  const showResults = hasVoted || isExpired;

  const toggleChoice = (opt) => {
    if (!poll.allow_multiple) {
      setSelected([opt]);
    } else {
      setSelected(prev => prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt]);
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!selected.length) return;
    setSubmitting(true);
    const { error } = await supabase.from('poll_votes').upsert(
      { poll_id: poll.id, user_id: user.id, choices: selected },
      { onConflict: 'poll_id,user_id' }
    );
    if (error) { addToast(error.message, 'error'); setSubmitting(false); return; }
    await fetchVotes();
    setSubmitting(false);
  };

  const options = poll.options ?? [];

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <h3 className="font-semibold text-slate-900">Poll</h3>
          </div>
          <p className="text-slate-700">{poll.question}</p>
        </div>
        <div className="text-right shrink-0 text-xs text-slate-400 space-y-0.5">
          <div>{totalVoters} {totalVoters === 1 ? 'vote' : 'votes'}</div>
          {poll.ends_at && (
            <div>{isExpired ? 'Closed' : `Closes ${formatDate(poll.ends_at)}`}</div>
          )}
          {poll.allow_multiple && <div>Multiple choice</div>}
        </div>
      </div>

      {showResults ? (
        <div className="space-y-2">
          {options.map(opt => {
            const count = votes[opt] ?? 0;
            const pct = totalVoters > 0 ? Math.round((count / totalVoters) * 100) : 0;
            const isMine = myChoices?.includes(opt);
            return (
              <div key={opt} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className={`font-medium ${isMine ? 'text-indigo-700' : 'text-slate-700'}`}>
                    {isMine && <span className="mr-1">✓</span>}{opt}
                  </span>
                  <span className="text-slate-400">{pct}% <span className="text-slate-300">({count})</span></span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${isMine ? 'bg-indigo-500' : 'bg-slate-300'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
          {!isExpired && hasVoted && (
            <button
              onClick={() => setMyChoices(null)}
              className="text-xs text-indigo-600 hover:underline pt-1"
            >
              Change vote
            </button>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          {options.map(opt => (
            <label key={opt} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
              ${selected.includes(opt) ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}>
              <input
                type={poll.allow_multiple ? 'checkbox' : 'radio'}
                name="poll"
                value={opt}
                checked={selected.includes(opt)}
                onChange={() => toggleChoice(opt)}
                className="w-4 h-4 text-indigo-600"
              />
              <span className="text-sm text-slate-800">{opt}</span>
            </label>
          ))}
          <button
            type="submit"
            disabled={submitting || !selected.length}
            className="btn-primary w-full mt-1"
          >
            {submitting ? 'Submitting…' : 'Submit vote'}
          </button>
        </form>
      )}
    </div>
  );
}

function formatDate(str) {
  if (!str) return '';
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
