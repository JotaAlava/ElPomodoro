import React, { useEffect, useMemo, useState } from 'react';
import Cookies from 'js-cookie';
import AppLayout from '../../components/AppLayout';
import { AppContext } from '../../components/AppContext';
import Todo, { IdName } from '../../components/Todos';
import Tomatoes from '../../components/Tomatoes';
import ContextPicker from '../../components/ContextPicker';
import TomatoTimer from '../../components/TomatoTimer';
import NewRow from '../../components/NewRow';
import { Context, PrismaClient, Tomato } from '@prisma/client';
import TomatoService from '../../services/tomatoService';
import { getSession, withPageAuthRequired } from '@auth0/nextjs-auth0';
import { loadTodos } from '../../services/todoService';
import ReactMarkdown from 'react-markdown';

const toDateKey = (d: Date) =>
	`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const computeStreak = (tomatoes: Array<any>): number => {
	if (!tomatoes.length) return 0;

	const uniqueDays = new Set<string>();
	tomatoes.forEach((t) => {
		const d = new Date(t.finished * 1000);
		uniqueDays.add(toDateKey(d));
	});

	const today = new Date();
	const todayKey = toDateKey(today);

	const checkDate = new Date(today);
	if (!uniqueDays.has(todayKey)) {
		checkDate.setDate(checkDate.getDate() - 1);
	}

	let streak = 0;
	while (uniqueDays.has(toDateKey(checkDate))) {
		streak++;
		checkDate.setDate(checkDate.getDate() - 1);
	}

	return streak;
};

export const getServerSideProps = withPageAuthRequired({
	returnTo: '/',
	async getServerSideProps(ctx) {
		const session = await getSession(ctx.req, ctx.res);
		const prisma = new PrismaClient();

		const todos = await loadTodos(session.user.sub);

		const tomatoService = new TomatoService(prisma, session);
		const tomatoes = await tomatoService.findManyForUser();
		const contexts = await prisma.context.findMany({
			where: {
				authorId: {
					equals: session.user.sub
				}
			}
		});

		const streak = computeStreak(tomatoes);
		const lastFinished: number | null = (tomatoes[0] as any)?.finished ?? null;

		return {
			props: {
				contexts,
				tomatoes,
				todos,
				streak,
				lastFinished
			}
		};
	}
});

const toIdName = (contexts: Array<Context>): { [id: string]: string } => {
	const result = {};

	contexts.forEach((ctx) => {
		result[ctx.id] = ctx.description;
	});

	return result;
};

const sortContextsByRecentUse = (contexts: Array<Context>, tomatoes: Array<any>): Array<Context> => {
	const lastUsed: { [id: string]: number } = {};
	tomatoes.forEach((t) => {
		if (t.contextId && (!lastUsed[t.contextId] || t.finished > lastUsed[t.contextId])) {
			lastUsed[t.contextId] = t.finished;
		}
	});
	return [...contexts].sort((a, b) => {
		const aTime = lastUsed[a.id] ?? 0;
		const bTime = lastUsed[b.id] ?? 0;
		if (aTime !== bTime) return bTime - aTime;
		return a.description.localeCompare(b.description);
	});
};

const toContextGoals = (contexts: Array<Context>): { [id: string]: number } => {
	const result = {};
	contexts.forEach((ctx) => {
		if (ctx.weeklyMinimum > 0) result[ctx.id] = ctx.weeklyMinimum;
	});
	return result;
};

const humanAgo = (epochSeconds: number): string => {
	const diffMs = Date.now() - epochSeconds * 1000;
	const mins = Math.floor(diffMs / 60000);
	if (mins < 60) return `${mins} min ago`;
	const hours = Math.floor(mins / 60);
	const rem = mins % 60;
	return rem > 0 ? `${hours}h ${rem}m ago` : `${hours}h ago`;
};

const getTimerRunning = (): boolean => {
	try {
		const val = Cookies.get('elPomodoroTimer');
		if (!val) return false;
		const state = JSON.parse(val);
		return !!state.started && state.mode === 'Work';
	} catch {
		return false;
	}
};

const StreakBar: React.FC<{ streak: number; lastFinished: number | null }> = ({
	streak,
	lastFinished
}) => {
	const [timeAgo, setTimeAgo] = useState<string | null>(
		lastFinished ? humanAgo(lastFinished) : null
	);
	const [isStale, setIsStale] = useState<boolean>(
		lastFinished ? Date.now() - lastFinished * 1000 > 90 * 60 * 1000 : false
	);
	const [sessionInProgress, setSessionInProgress] = useState<boolean>(getTimerRunning);

	useEffect(() => {
		if (!lastFinished) return;
		const update = () => {
			setTimeAgo(humanAgo(lastFinished));
			setIsStale(Date.now() - lastFinished * 1000 > 90 * 60 * 1000);
		};
		const id = setInterval(update, 60000);
		return () => clearInterval(id);
	}, [lastFinished]);

	useEffect(() => {
		const id = setInterval(() => setSessionInProgress(getTimerRunning()), 1000);
		return () => clearInterval(id);
	}, []);

	if (streak === 0 && !lastFinished && !sessionInProgress) return null;

	return (
		<div
			className="d-flex align-items-center justify-content-center gap-3 py-2 mb-2 text-small"
			style={{ fontSize: '0.9rem', gap: '1rem' }}
		>
			{streak > 0 && (
				<span className={streak >= 1 ? 'text-success' : 'text-secondary'}>
					🔥 {streak}-day streak
				</span>
			)}
			{streak > 0 && (lastFinished || sessionInProgress) && (
				<span style={{ color: '#6c757d' }}>|</span>
			)}
			{sessionInProgress ? (
				<span className="text-primary">🍅 Session in progress</span>
			) : (lastFinished && timeAgo && (
				<span className={isStale ? 'text-warning' : 'text-success'}>
					Last session: {timeAgo}
				</span>
			))}
		</div>
	);
};

export default function TomatoMain({ user, tomatoes, todos, contexts, streak, lastFinished }) {
	const [loadedTomatoes, setTomatoes] = useState<Array<Tomato>>(tomatoes);
	const [selectedContext, setSelectedContext] = useState<Context>(undefined);
	const sortedContexts = useMemo(() => sortContextsByRecentUse(contexts, loadedTomatoes), [contexts, loadedTomatoes]);
	const [idNameContexts] = useState<IdName>(toIdName(contexts));
	const [currentLastFinished, setCurrentLastFinished] = useState<number | null>(lastFinished);
	const [timerRunning, setTimerRunning] = useState<boolean>(getTimerRunning);

	const onSave = (newTomatoes: Array<Tomato>) => {
		setTomatoes(newTomatoes);
		setCurrentLastFinished(Math.floor(Date.now() / 1000));
	};

	const [pendingDescription, setPendingDescription] = useState<string | undefined>(undefined);

	// ── Generate Stand-up (scoped to the selected context) ──────────────────
	const [standup, setStandup] = useState<string>('');
	const [standupLoading, setStandupLoading] = useState(false);
	const [standupError, setStandupError] = useState<string>('');
	const [showStandup, setShowStandup] = useState(false);

	const generateStandup = async () => {
		if (!selectedContext) return;
		setShowStandup(true);
		setStandupLoading(true);
		setStandupError('');
		setStandup('');
		try {
			const response = await fetch('/api/standup', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ contextId: selectedContext.id })
			});

			// The server may return a non-JSON body (e.g. a platform error page),
			// so read text first and parse defensively rather than calling .json()
			// blindly — that's what produced "Unexpected token 'A'... is not valid JSON".
			const text = await response.text();
			let result: any = {};
			try {
				result = text ? JSON.parse(text) : {};
			} catch {
				throw new Error(
					response.ok ? 'Unexpected response from server.' : text.slice(0, 200)
				);
			}

			if (!response.ok) {
				throw new Error(result.error || 'Failed to generate stand-up.');
			}
			setStandup(result.standup);
		} catch (err) {
			setStandupError(
				err instanceof Error ? err.message : 'Failed to generate stand-up.'
			);
		} finally {
			setStandupLoading(false);
		}
	};

	// ── Generate Pay-Raise case (scoped to the selected context) ────────────
	const [raise, setRaise] = useState<string>('');
	const [raiseLoading, setRaiseLoading] = useState(false);
	const [raiseError, setRaiseError] = useState<string>('');
	const [showRaise, setShowRaise] = useState(false);

	const generateRaise = async () => {
		if (!selectedContext) return;
		setShowRaise(true);
		setRaiseLoading(true);
		setRaiseError('');
		setRaise('');
		try {
			const response = await fetch('/api/raise', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ contextId: selectedContext.id })
			});

			const text = await response.text();
			let result: any = {};
			try {
				result = text ? JSON.parse(text) : {};
			} catch {
				throw new Error(
					response.ok ? 'Unexpected response from server.' : text.slice(0, 200)
				);
			}

			if (!response.ok) {
				throw new Error(result.error || 'Failed to generate pay-raise case.');
			}
			setRaise(result.raise);
		} catch (err) {
			setRaiseError(
				err instanceof Error ? err.message : 'Failed to generate pay-raise case.'
			);
		} finally {
			setRaiseLoading(false);
		}
	};

	const todayCount = loadedTomatoes.filter((t) => {
		const d = new Date((t as any).finished * 1000);
		const now = new Date();
		return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
	}).length;

	const pendingTodos = todos
		.filter((t: any) => !t.completed && (!selectedContext || t.contextId === selectedContext.id))
		.map((t: any) => ({
			id: t.id,
			description: t.description,
			contextId: t.contextId ?? undefined,
			contextName: t.contextId ? idNameContexts[t.contextId] : undefined,
		}));

	return (
		<AppContext.Provider value={{ user }}>
			<AppLayout>
				{/* ── First fold: timer ── */}
				<TomatoTimer
					onSessionChange={setTimerRunning}
					onTimerComplete={(desc) => setPendingDescription(desc)}
					onTodoSelect={(ctxId) => setSelectedContext(ctxId ? contexts.find((c) => c.id === ctxId) : undefined)}
					todayCount={todayCount}
					todos={pendingTodos}
					selectedContextName={selectedContext?.description}
					onGenerateStandup={generateStandup}
					standupDisabled={!selectedContext}
					standupLoading={standupLoading}
					onGenerateRaise={generateRaise}
					raiseDisabled={!selectedContext}
					raiseLoading={raiseLoading}
				/>

				{showRaise && (
					<div
						onClick={() => setShowRaise(false)}
						style={{
							position: 'fixed',
							inset: 0,
							background: 'rgba(0,0,0,0.6)',
							zIndex: 10000,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							padding: '1rem'
						}}
					>
						<div
							onClick={(e) => e.stopPropagation()}
							style={{
								background: '#1a1610',
								color: '#fff9ec',
								border: '1px solid rgba(255,249,236,0.12)',
								borderRadius: 12,
								maxWidth: 720,
								width: '100%',
								maxHeight: '80vh',
								overflowY: 'auto',
								padding: '1.5rem 1.75rem',
								boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
							}}
						>
							<div className="d-flex align-items-center justify-content-between mb-3">
								<h5 style={{ margin: 0, fontWeight: 600 }}>
									Pay Raise · {selectedContext?.description}
								</h5>
								<button
									onClick={() => setShowRaise(false)}
									style={{
										background: 'none',
										border: 'none',
										color: '#b3aa99',
										fontSize: '1.4rem',
										lineHeight: 1,
										cursor: 'pointer'
									}}
									aria-label="Close"
								>
									×
								</button>
							</div>

							{raiseLoading ? (
								<p style={{ color: '#b3aa99', margin: 0 }}>
									Building your pay-raise case…
								</p>
							) : raiseError ? (
								<p style={{ color: '#da2048', margin: 0 }}>{raiseError}</p>
							) : (
								<>
									<div style={{ fontSize: '0.92rem', lineHeight: 1.6 }}>
										<ReactMarkdown>{raise}</ReactMarkdown>
									</div>
									<button
										className="btn btn-sm mt-3"
										onClick={() => navigator.clipboard.writeText(raise)}
										style={{
											background: 'transparent',
											border: '1px solid rgba(255,249,236,0.12)',
											color: '#b3aa99',
											borderRadius: 8,
											fontSize: '0.8rem'
										}}
									>
										Copy
									</button>
								</>
							)}
						</div>
					</div>
				)}

				{showStandup && (
					<div
						onClick={() => setShowStandup(false)}
						style={{
							position: 'fixed',
							inset: 0,
							background: 'rgba(0,0,0,0.6)',
							zIndex: 10000,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							padding: '1rem'
						}}
					>
						<div
							onClick={(e) => e.stopPropagation()}
							style={{
								background: '#1a1610',
								color: '#fff9ec',
								border: '1px solid rgba(255,249,236,0.12)',
								borderRadius: 12,
								maxWidth: 720,
								width: '100%',
								maxHeight: '80vh',
								overflowY: 'auto',
								padding: '1.5rem 1.75rem',
								boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
							}}
						>
							<div className="d-flex align-items-center justify-content-between mb-3">
								<h5 style={{ margin: 0, fontWeight: 600 }}>
									Stand-up · {selectedContext?.description}
								</h5>
								<button
									onClick={() => setShowStandup(false)}
									style={{
										background: 'none',
										border: 'none',
										color: '#b3aa99',
										fontSize: '1.4rem',
										lineHeight: 1,
										cursor: 'pointer'
									}}
									aria-label="Close"
								>
									×
								</button>
							</div>

							{standupLoading ? (
								<p style={{ color: '#b3aa99', margin: 0 }}>
									Generating your stand-up…
								</p>
							) : standupError ? (
								<p style={{ color: '#da2048', margin: 0 }}>{standupError}</p>
							) : (
								<>
									<div style={{ fontSize: '0.92rem', lineHeight: 1.6 }}>
										<ReactMarkdown>{standup}</ReactMarkdown>
									</div>
									<button
										className="btn btn-sm mt-3"
										onClick={() => navigator.clipboard.writeText(standup)}
										style={{
											background: 'transparent',
											border: '1px solid rgba(255,249,236,0.12)',
											color: '#b3aa99',
											borderRadius: 8,
											fontSize: '0.8rem'
										}}
									>
										Copy
									</button>
								</>
							)}
						</div>
					</div>
				)}

				{/* ── Below fold ── */}
				<div className="content-fold">
					<div className="container py-4">
						<StreakBar streak={streak} lastFinished={currentLastFinished} />
						<NewRow
							field="tomato"
							onSubmit={(result) => { onSave(result as Array<Tomato>); setPendingDescription(undefined); }}
							selectedContext={selectedContext}
							lastTomato={loadedTomatoes[0] ?? null}
							prefillDescription={pendingDescription}
						/>
						<div className={timerRunning ? 'focus-dim-soft' : ''}>
							<ContextPicker
								contexts={sortedContexts}
								contextSelected={setSelectedContext}
								selectedContext={selectedContext}
							/>
						</div>
						<div className={`row${timerRunning ? ' focus-dim' : ''}`}>
							<Todo
								todos={todos}
								contexts={idNameContexts}
								selectedContext={selectedContext}
							/>
							<Tomatoes
								tomatoes={loadedTomatoes}
								contexts={idNameContexts}
								selectedContext={selectedContext}
								reAssignedContext={onSave}
								contextGoals={toContextGoals(contexts)}
							/>
						</div>
					</div>
				</div>
			</AppLayout>
		</AppContext.Provider>
	);
}
