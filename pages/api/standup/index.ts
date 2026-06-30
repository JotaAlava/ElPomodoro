import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getSession, withApiAuthRequired } from '@auth0/nextjs-auth0';
import Anthropic from '@anthropic-ai/sdk';

const prisma = new PrismaClient();

// ── The Staff Engineer stand-up prompt ──────────────────────────────────────
//
// The data we hand the model is intentionally thin (focus sessions + todos
// grouped by context). The prompt does the heavy lifting: it asks the model to
// reason about that raw activity the way a Staff Engineer would — connecting
// the dots across contexts, surfacing risk and dependencies, and framing the
// work in terms of impact and leverage rather than a flat list of tasks.

const SYSTEM_PROMPT = `You are a Staff Software Engineer writing your own daily stand-up update.

You are given a structured digest of the previous 24 hours of work, grouped by "context" (a project, workstream, or area of focus). Each context lists the focus sessions completed (one ≈ 25 minutes of deep work) and the tasks captured or planned. This is the raw signal of where time and attention went.

Write a stand-up update that reads the way a respected Staff Engineer's would. That means demonstrating, not announcing, the following traits:

- Systems thinking: connect activity across contexts. Show how pieces relate, where one workstream unblocks or threatens another, and what the work means for the larger system — not just what was touched.
- Impact and leverage: frame work by the outcome it moves and the leverage it creates for others, not by hours logged or tasks closed. Effort is an input; call out the result.
- Risk and dependency awareness: name the things most likely to slip, the cross-team or technical dependencies in play, and where you are blocked or about to be.
- Prioritization with rationale: make the trade-offs explicit. Why this, not that — and what you are deliberately deferring.
- Calibrated judgment: be honest about uncertainty and confidence. Don't overstate progress; don't bury a real risk.
- Force multiplication: where relevant, surface where you unblocked, mentored, reviewed, or set direction for others.

Structure the update under these headings (use Markdown):
**Yesterday** — what moved and why it mattered (outcomes, not a task log).
**Today** — the highest-leverage focus and the reasoning behind that choice.
**Risks & Dependencies** — what could slip, what you're blocked on, what needs a decision.
**Systems View** — one short paragraph zooming out: how these threads fit together and what the trajectory implies.

Be concise and specific. Ground every claim in the digest — do not invent work that isn't represented in the data. If the data is sparse, say so plainly and keep the update short rather than padding it. Lead with the outcome in each section. Write in the first person, as the engineer.`;

type ContextDigest = {
	context: string;
	weeklyMinimum: number;
	sessions: string[];
	sessionCount: number;
	todos: { description: string; dueDate: string | null }[];
};

const buildDigest = async (userSub: string): Promise<ContextDigest[]> => {
	const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

	const [contexts, tomatoes, todos] = await Promise.all([
		prisma.context.findMany({
			where: { authorId: userSub, deleted: false }
		}),
		prisma.tomato.findMany({
			where: {
				authorId: userSub,
				deleted: false,
				finished: { gte: since }
			},
			orderBy: { finished: 'asc' }
		}),
		prisma.todo.findMany({
			where: { authorId: userSub, created: { gte: since } },
			orderBy: { created: 'asc' }
		})
	]);

	const contextById = new Map(contexts.map((c) => [c.id, c]));

	// Group activity by context id; null/unknown contexts collapse into "Uncategorized".
	const UNCATEGORIZED = '__uncategorized__';
	const groups = new Map<string, ContextDigest>();

	const ensureGroup = (id: string | null): ContextDigest => {
		const key = id && contextById.has(id) ? id : UNCATEGORIZED;
		if (!groups.has(key)) {
			const ctx = id ? contextById.get(id) : undefined;
			groups.set(key, {
				context: ctx?.description ?? 'Uncategorized',
				weeklyMinimum: ctx?.weeklyMinimum ?? 0,
				sessions: [],
				sessionCount: 0,
				todos: []
			});
		}
		return groups.get(key);
	};

	tomatoes.forEach((t) => {
		const g = ensureGroup(t.contextId);
		g.sessions.push(t.description);
		g.sessionCount += 1;
	});

	todos.forEach((t) => {
		const g = ensureGroup(t.contextId);
		g.todos.push({ description: t.description, dueDate: t.dueDate });
	});

	return Array.from(groups.values()).sort(
		(a, b) => b.sessionCount - a.sessionCount
	);
};

const renderDigest = (digest: ContextDigest[]): string => {
	if (digest.length === 0) {
		return 'No focus sessions or tasks were recorded in the last 24 hours.';
	}

	return digest
		.map((g) => {
			const lines: string[] = [];
			lines.push(`## Context: ${g.context}`);
			if (g.weeklyMinimum > 0) {
				lines.push(`- Weekly session target: ${g.weeklyMinimum}`);
			}
			lines.push(
				`- Focus sessions completed (last 24h): ${g.sessionCount} (~${
					g.sessionCount * 25
				} min)`
			);
			if (g.sessions.length > 0) {
				lines.push('- Session descriptions:');
				g.sessions.forEach((s) => lines.push(`  - ${s}`));
			}
			if (g.todos.length > 0) {
				lines.push('- Tasks captured/planned:');
				g.todos.forEach((t) =>
					lines.push(
						`  - ${t.description}${t.dueDate ? ` (due ${t.dueDate})` : ''}`
					)
				);
			}
			return lines.join('\n');
		})
		.join('\n\n');
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

	const { user } = await getSession(req, res);

	try {
		const digest = await buildDigest(user.sub);
		const digestText = renderDigest(digest);

		const anthropic = new Anthropic();

		const message = await anthropic.messages.create({
			model: 'claude-opus-4-8',
			max_tokens: 4096,
			thinking: { type: 'adaptive' },
			system: SYSTEM_PROMPT,
			messages: [
				{
					role: 'user',
					content: `Here is my work digest for the previous 24 hours:\n\n${digestText}\n\nWrite my stand-up update.`
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
