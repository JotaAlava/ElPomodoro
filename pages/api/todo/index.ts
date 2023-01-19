import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import * as yup from 'yup';
import { withSchemaValidation } from '../../../middleware/withSchemaValidation';
import { getSession, withApiAuthRequired } from '@auth0/nextjs-auth0';

const prisma = new PrismaClient();
export interface TodoRequest extends NextApiRequest {
	body: {
		id?: string;
		description: string;
	};
}

const schema = yup.object().shape({
	description: yup.string().required()
});

const handler = async (req: TodoRequest, res: NextApiResponse) => {
	const { user } = await getSession(req, res);
	if (req.method === 'GET') {
		const allTodos = prisma.todo.findMany();
		res.statusCode = 200;
		res.json(allTodos);
	} else if (req.method === 'POST') {
		await prisma.todo.create({
			data: {
				description: req.body.description,
				authorId: user.sub
			}
		});

		const allTodos = await prisma.todo.findMany();
		res.json(allTodos);
	} else if (req.method === 'DELETE') {
		await prisma.todo.delete({
			where: {
				id: req.body.id
			}
		});

		const allTodos = await prisma.todo.findMany();
		res.json(allTodos);
	} else {
		res.statusCode = 404; // 404 or anything you want
		res.json(new Error('NOT SUPPORTED 500')); // or 404 or anything
	}
};

export default withApiAuthRequired(withSchemaValidation(schema, handler));
