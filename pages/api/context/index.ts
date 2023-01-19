import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import * as yup from 'yup';
import { withSchemaValidation } from '../../../middleware/withSchemaValidation';
import { getSession, withApiAuthRequired } from '@auth0/nextjs-auth0';

const prisma = new PrismaClient();
export interface ContextRequest extends NextApiRequest {
	body: {
		id?: string;
		description: string;
	};
}

const schema = yup.object().shape({
	description: yup.string().required()
});

const handler = async (req: ContextRequest, res: NextApiResponse) => {
	const { user } = await getSession(req, res);
	try {
		if (req.method === 'GET') {
			const allContexts = prisma.context.findMany();
			res.statusCode = 200;
			res.json(allContexts);
		} else if (req.method === 'POST') {
			await prisma.context.create({
				data: {
					description: req.body.description,
					authorId: user.sub
				}
			});

			const allContexts = await prisma.context.findMany();
			res.json(allContexts);
		} else if (req.method === 'PUT') {
			await prisma.context.update({
				where: {
					id: req.body.id
				},
				data: {
					description: req.body.description,
					authorId: user.sub
				}
			});

			const allContexts = await prisma.context.findMany();
			res.json(allContexts);
		} else if (req.method === 'DELETE') {
			await prisma.context.delete({
				where: {
					id: req.body.id
				}
			});

			const allContexts = await prisma.context.findMany();
			res.json(allContexts);
		} else {
			res.statusCode = 400;
			res.json(new Error('Not supported')); // or 404 or anything
		}
	} catch (error) {
		console.log(error);
	}
};

export default withApiAuthRequired(withSchemaValidation(schema, handler));
