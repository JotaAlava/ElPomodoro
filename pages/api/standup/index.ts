import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getSession, withApiAuthRequired } from '@auth0/nextjs-auth0';
import Anthropic from '@anthropic-ai/sdk';

const prisma = new PrismaClient();

// maxDuration for this route is set in vercel.json (Next 13.0.6 ignores the
// route-level config export).

// ── The stand-up prompt ──────────────────────────────────────────────────────
//
// The stand-up answers exactly two questions for a single context:
//   1. What did you work on today?  → informed by today's logged focus sessions.
//   2. What do you plan on working on the next work day?  → informed by the
//      pending to-dos for the context.

const SYSTEM_PROMPT = `You are a software engineer writing a concise daily stand-up for a single project / context. Answer ONLY these two questions — nothing else:

1. What did you work on today?
2. What do you plan on working on the next work day?

Rules:
- Answer question 1 strictly from the focus sessions logged today (each session ≈ 25 minutes of deep work). Summarize what was actually worked on. If no sessions were logged today, say so in one sentence.
- Answer question 2 strictly from the pending to-do items for this context. Frame them as the plan for the next work day. If there are no pending to-dos, say so in one sentence.
- Do not invent work or plans that are not represented in the provided data. Do not add extra sections, risks, or commentary.

Format the response in Markdown with exactly these two headings and nothing before or after them:

**What did you work on today?**

**What do you plan on working on the next work day?**

Write in the first person, be concise, and lead with the substance (no preamble).`;

type StandupDigest = {
	context: string;
	sessionsToday: string[];
	pendingTodos: { description: string; dueDate: string | null; deferredDate: string | null }[];
};

const TODO_CAP = 50;

const buildDigest = async (
	userSub: string,
	contextId: string
): Promise<StandupDigest | null> => {
	const context = await prisma.context.findFirst({
		where: { id: contextId, authorId: userSub, deleted: false }
	});

	// Context must exist and belong to this user.
	if (!context) return null;

	const startOfToday = new Date();
	startOfToday.setHours(0, 0, 0, 0);

	const [tomatoes, todos] = await Promise.all([
		prisma.tomato.findMany({
			where: {
				authorId: userSub,
				deleted: false,
				contextId,
				finished: { gte: startOfToday }
			},
			orderBy: { finished: 'asc' }
		}),
		prisma.todo.findMany({
			where: { authorId: userSub, contextId },
			orderBy: { created: 'desc' },
			take: TODO_CAP
		})
	]);

	return {
		context: context.description,
		sessionsToday: tomatoes.map((t) => t.description),
		pendingTodos: todos.map((t) => ({
			description: t.description,
			dueDate: t.dueDate,
			deferredDate: t.deferredDate
		}))
	};
};

const renderDigest = (g: StandupDigest): string => {
	const lines: string[] = [];
	lines.push(`Context: ${g.context}`);
	lines.push('');
	lines.push(`Focus sessions logged today (${g.sessionsToday.length}):`);
	if (g.sessionsToday.length > 0) {
		g.sessionsToday.forEach((s) => lines.push(`- ${s}`));
	} else {
		lines.push('- (none logged today)');
	}
	lines.push('');
	lines.push(`Pending to-dos for this context (${g.pendingTodos.length}):`);
	if (g.pendingTodos.length > 0) {
		g.pendingTodos.forEach((t) => {
			const meta = [
				t.dueDate ? `due ${t.dueDate}` : null,
				t.deferredDate ? `deferred until ${t.deferredDate}` : null
			]
				.filter(Boolean)
				.join(', ');
			lines.push(`- ${t.description}${meta ? ` (${meta})` : ''}`);
		});
	} else {
		lines.push('- (none)');
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
					content: `Here is the data for my stand-up on this context:\n\n${renderDigest(
						digest
					)}\n\nWrite my stand-up.`
				}
			]
		});

		const standup = message.content
			.filter((block) => block.type === 'text')
			.map((block) => (block as Anthropic.TextBlock).text)
			.join('\n')
			.trim();

		res.status(200).json({ standup });
	} catch (error) {
		console.log(error);
		res.status(500).json({ error: 'Failed to generate stand-up.' });
	}
};

export default withApiAuthRequired(handler);
