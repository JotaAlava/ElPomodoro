import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getSession, withApiAuthRequired } from '@auth0/nextjs-auth0';
import Anthropic from '@anthropic-ai/sdk';

const prisma = new PrismaClient();

// Vercel serverless functions default to a short timeout (~10s); an Opus 4.8
// call overruns it and surfaces as FUNCTION_INVOCATION_TIMEOUT. The cap is
// raised in vercel.json (the `functions` entry), which works on this Next
// version. `export const config.maxDuration` is ignored before Next 13.5, so
// vercel.json is the source of truth here. 60s is the Hobby-plan max.

// ── The Staff Engineer stand-up prompt ──────────────────────────────────────
//
// The stand-up is scoped to a single context (a project / workstream / area of
// focus). We hand the model a thin digest — the focus sessions and tasks from
// the last 24 hours for that one context — and the prompt does the heavy
// lifting: it asks the model to reason about that raw activity the way a Staff
// Engineer would, framing it in terms of impact, leverage, risk, and how this
// workstream fits into the larger system.

const SYSTEM_PROMPT = `You are a Staff Software Engineer writing your own daily stand-up update for a single workstream / context.

You are given a digest of the previous 24 hours of work on ONE context: the focus sessions completed (one ≈ 25 minutes of deep work) and the tasks captured or planned. This is the raw signal of where time and attention went on this workstream.

Write a stand-up update that reads the way a respected Staff Engineer's would. Demonstrate, not announce, the following traits:

- Systems thinking: even though this is one context, situate it in the larger system. Show what this work unblocks or threatens elsewhere, the upstream/downstream dependencies it touches, and what it means beyond the immediate task.
- Impact and leverage: frame work by the outcome it moves and the leverage it creates for others, not by hours logged or tasks closed. Effort is an input; call out the result.
- Risk and dependency awareness: name what is most likely to slip, the cross-team or technical dependencies in play, and where you are blocked or about to be.
- Prioritization with rationale: make the trade-offs explicit. Why this, not that — and what you are deliberately deferring.
- Calibrated judgment: be honest about uncertainty and confidence. Don't overstate progress; don't bury a real risk.
- Force multiplication: where relevant, surface where you unblocked, mentored, reviewed, or set direction for others.

Structure the update under these headings (use Markdown):
**Yesterday** — what moved and why it mattered (outcomes, not a task log).
**Today** — the highest-leverage focus and the reasoning behind that choice.
**Risks & Dependencies** — what could slip, what you're blocked on, what needs a decision.
**Systems View** — one short paragraph zooming out: how this workstream fits the broader system and what the trajectory implies.

Be concise and specific. Ground every claim in the digest — do not invent work that isn't represented in the data. If the data is sparse, say so plainly and keep the update short rather than padding it. Lead with the outcome in each section. Write in the first person, as the engineer.`;

type ContextDigest = {
	context: string;
	weeklyMinimum: number;
	sessions: string[];
	sessionCount: number;
	todos: { description: string; dueDate: string | null }[];
};

const buildDigest = async (
	userSub: string,
	contextId: string
): Promise<ContextDigest | null> => {
	const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

	const context = await prisma.context.findFirst({
		where: { id: contextId, authorId: userSub, deleted: false }
	});

	// Context must exist and belong to this user.
	if (!context) return null;

	const [tomatoes, todos] = await Promise.all([
		prisma.tomato.findMany({
			where: {
				authorId: userSub,
				deleted: false,
				contextId,
				finished: { gte: since }
			},
			orderBy: { finished: 'asc' }
		}),
		prisma.todo.findMany({
			where: { authorId: userSub, contextId, created: { gte: since } },
			orderBy: { created: 'asc' }
		})
	]);

	return {
		context: context.description,
		weeklyMinimum: context.weeklyMinimum,
		sessions: tomatoes.map((t) => t.description),
		sessionCount: tomatoes.length,
		todos: todos.map((t) => ({ description: t.description, dueDate: t.dueDate }))
	};
};

const renderDigest = (g: ContextDigest): string => {
	const lines: string[] = [];
	lines.push(`Context: ${g.context}`);
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
			lines.push(`  - ${t.description}${t.dueDate ? ` (due ${t.dueDate})` : ''}`)
		);
	}
	if (g.sessionCount === 0 && g.todos.length === 0) {
		lines.push('- No focus sessions or tasks were recorded in the last 24 hours.');
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
			// A stand-up is short; cap output and keep effort low to stay well
			// inside the serverless timeout.
			max_tokens: 2048,
			thinking: { type: 'adaptive' },
			output_config: { effort: 'low' },
			system: SYSTEM_PROMPT,
			messages: [
				{
					role: 'user',
					content: `Here is my work digest for the previous 24 hours on this context:\n\n${renderDigest(
						digest
					)}\n\nWrite my stand-up update.`
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
