import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import * as yup from 'yup';
import { withSchemaValidation } from '../../../middleware/withSchemaValidation';
import { getSession, withApiAuthRequired } from '@auth0/nextjs-auth0';
import { loadTodos } from '../../../services/todoService';

const prisma = new PrismaClient();
export interface TodoRequest extends NextApiRequest {
	body: {
		id?: string;
		description: string;
		contextId?: string;
		dueDate?: string;
	};
}

const schema = yup.object().shape({
	description: yup.string().required()
});

const handler = async (req: TodoRequest, res: NextApiResponse) => {
	const { user } = await getSession(req, res);

	if (req.method === 'GET') {
		const allTodos = await loadTodos(user.sub);
		res.statusCode = 200;
		res.json(allTodos);
	} else if (req.method === 'POST') {
		await prisma.todo.create({
			data: {
				description: req.body.description,
				authorId: user.sub
			}
		});

		const allTodos = await loadTodos(user.sub);
		res.json(allTodos);
	} else if (req.method === 'DELETE') {
		await prisma.todo.delete({
			where: {
				id: req.body.id
			}
		});

		const allTodos = await loadTodos(user.sub);
		res.json(allTodos);
	} else if (req.method === 'PUT') {
		await prisma.todo.update({
			where: {
				id: req.body.id
			},
			data: {
				dueDate: req.body.dueDate || null,
				contextId: req.body.contextId || null
			}
		});

		const allTodos = await loadTodos(user.sub);
		res.json(allTodos);
	} else {
		res.statusCode = 404; // 404 or anything you want
		res.json(new Error('NOT SUPPORTED 500')); // or 404 or anything
	}
};

export default withApiAuthRequired(withSchemaValidation(schema, handler));
