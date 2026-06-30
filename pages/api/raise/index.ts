import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getSession, withApiAuthRequired } from '@auth0/nextjs-auth0';
import Anthropic from '@anthropic-ai/sdk';

const prisma = new PrismaClient();

// maxDuration for this route is set in vercel.json (Next 13.0.6 ignores the
// route-level config export). See pages/api/standup/index.ts for context.

// ── The pay-raise prompt ─────────────────────────────────────────────────────
//
// Unlike the stand-up (a 24h snapshot), a raise case is cumulative — so we hand
// the model the full body of work invested in a single context: total focus
// hours, the span of effort, representative session descriptions, and tasks.
// The prompt turns that into an honest, evidence-grounded argument for a raise.

const SYSTEM_PROMPT = `You are helping a software engineer build the case for a pay raise, grounded in the actual work they have invested in a single project / context.

You are given a digest for ONE context: the total number of focus sessions completed (one ≈ 25 minutes of deep work), the total focus time, the span of dates over which the work happened, representative session descriptions, and tasks captured. This is the evidence base.

Write a set of compelling, honest "reasons for a pay raise" the engineer could bring to a performance review or a conversation with their manager. Make the argument the way a thoughtful Staff Engineer would frame their own impact:

- Lead with impact and outcomes, not hours. Hours and session counts are evidence of sustained investment, but the argument is about what that effort delivered and the value it created.
- Show scope and ownership: the breadth of the work in this context, the consistency over time, and the responsibility taken on.
- Demonstrate leverage and force multiplication where the work supports it: unblocking others, raising the bar, reducing future cost, de-risking the system.
- Be specific and grounded. Every reason must trace back to something in the digest — do NOT invent accomplishments, metrics, or scope that the data does not support. If the data is thin, make a measured case and say what additional evidence would strengthen it rather than padding.
- Be calibrated and credible, not boastful. A manager should read this and find it fair and well-supported.

Structure the output in Markdown:
**The case at a glance** — one or two sentences summarizing the investment and its value.
**Reasons for a raise** — a numbered list. Each item: a bold headline claim, then 1–2 sentences of supporting evidence drawn from the digest.
**How to strengthen this further** — a short, honest note on what additional evidence (metrics, peer feedback, business outcomes) would make the case even stronger.

Write in the first person, as the engineer. Be concise.`;

type RaiseDigest = {
	context: string;
	weeklyMinimum: number;
	totalSessions: number;
	totalFocusHours: number;
	firstSession: string | null;
	lastSession: string | null;
	sessionSamples: string[];
	todos: string[];
};

const SESSION_SAMPLE_CAP = 60;
const TODO_CAP = 40;

const buildDigest = async (
	userSub: string,
	contextId: string
): Promise<RaiseDigest | null> => {
	const context = await prisma.context.findFirst({
		where: { id: contextId, authorId: userSub, deleted: false }
	});

	// Context must exist and belong to this user.
	if (!context) return null;

	const baseWhere = { authorId: userSub, deleted: false, contextId };

	const [totalSessions, recent, oldest, samples, todos] = await Promise.all([
		prisma.tomato.count({ where: baseWhere }),
		prisma.tomato.findMany({
			where: baseWhere,
			orderBy: { finished: 'desc' },
			take: 1
		}),
		prisma.tomato.findMany({
			where: baseWhere,
			orderBy: { finished: 'asc' },
			take: 1
		}),
		// Representative descriptions — capped so the prompt stays bounded.
		prisma.tomato.findMany({
			where: baseWhere,
			orderBy: { finished: 'desc' },
			take: SESSION_SAMPLE_CAP
		}),
		prisma.todo.findMany({
			where: { authorId: userSub, contextId },
			orderBy: { created: 'desc' },
			take: TODO_CAP
		})
	]);

	const fmt = (d: Date | null | undefined) =>
		d ? new Date(d).toISOString().slice(0, 10) : null;

	return {
		context: context.description,
		weeklyMinimum: context.weeklyMinimum,
		totalSessions,
		totalFocusHours: Math.round((totalSessions * 25) / 6) / 10, // 1 decimal
		firstSession: fmt(oldest[0]?.finished as any),
		lastSession: fmt(recent[0]?.finished as any),
		sessionSamples: samples.map((t) => t.description),
		todos: todos.map((t) => t.description)
	};
};

const renderDigest = (g: RaiseDigest): string => {
	const lines: string[] = [];
	lines.push(`Context: ${g.context}`);
	lines.push(`- Total focus sessions (all time): ${g.totalSessions}`);
	lines.push(`- Total focus time: ~${g.totalFocusHours} hours`);
	if (g.firstSession && g.lastSession) {
		lines.push(`- Work spanned: ${g.firstSession} → ${g.lastSession}`);
	}
	if (g.weeklyMinimum > 0) {
		lines.push(`- Weekly session commitment: ${g.weeklyMinimum}`);
	}
	if (g.sessionSamples.length > 0) {
		lines.push(
			`- Representative session descriptions (most recent ${g.sessionSamples.length}):`
		);
		g.sessionSamples.forEach((s) => lines.push(`  - ${s}`));
	}
	if (g.todos.length > 0) {
		lines.push('- Tasks tracked in this context:');
		g.todos.forEach((t) => lines.push(`  - ${t}`));
	}
	if (g.totalSessions === 0 && g.todos.length === 0) {
		lines.push('- No focus sessions or tasks have been recorded for this context.');
	}
	return lines.join('\n');
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
	if (req.method !== 'POST') {
		res.status(405).json({ error: 'Method not allowed' });
		return;
	}

	if (!process.env.ANTHROPIC_API_KEY) {
		res.status(500).json({
			error: 'ANTHROPIC_API_KEY is not configured on the server.'
		});
		return;
	}

	const contextId = req.body?.contextId;
	if (!contextId || typeof contextId !== 'string') {
		res.status(400).json({ error: 'A contextId is required.' });
		return;
	}

	const { user } = await getSession(req, res);

	try {
		const digest = await buildDigest(user.sub, contextId);
		if (!digest) {
			res.status(404).json({ error: 'Context not found.' });
			return;
		}

		const anthropic = new Anthropic();

		const message = await anthropic.messages.create({
			model: 'claude-opus-4-8',
			max_tokens: 2048,
			thinking: { type: 'adaptive' },
			output_config: { effort: 'low' },
			system: SYSTEM_PROMPT,
			messages: [
				{
					role: 'user',
					content: `Here is the digest of my work on this context:\n\n${renderDigest(
						digest
					)}\n\nBuild my case for a pay raise.`
				}
			]
		});

		const raise = message.content
			.filter((block) => block.type === 'text')
			.map((block) => (block as Anthropic.TextBlock).text)
			.join('\n')
			.trim();

		res.status(200).json({ raise });
	} catch (error) {
		console.log(error);
		res.status(500).json({ error: 'Failed to generate pay-raise case.' });
	}
};

export default withApiAuthRequired(handler);
