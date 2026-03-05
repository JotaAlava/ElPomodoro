import React, { useEffect, useState } from 'react';
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
	const [idNameContexts] = useState<IdName>(toIdName(contexts));
	const [currentLastFinished, setCurrentLastFinished] = useState<number | null>(lastFinished);
	const [timerRunning, setTimerRunning] = useState<boolean>(getTimerRunning);

	const onSave = (newTomatoes: Array<Tomato>) => {
		setTomatoes(newTomatoes);
		setCurrentLastFinished(Math.floor(Date.now() / 1000));
	};

	const [pendingDescription, setPendingDescription] = useState<string | undefined>(undefined);

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
				/>

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
								contexts={contexts}
								contextSelected={setSelectedContext}
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
