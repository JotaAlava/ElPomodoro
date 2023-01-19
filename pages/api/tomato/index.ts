import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import * as yup from 'yup';
import { getSession, withApiAuthRequired } from '@auth0/nextjs-auth0';
import { withSchemaValidation } from '../../../middleware/withSchemaValidation';
import TomatoService from '../../../services/tomatoService';

const prisma = new PrismaClient();
const schema = yup.object().shape({
	description: yup.string().required().max(255)
});

export interface TomatoRequest extends NextApiRequest {
	body: {
		id?: string;
		description: string;
		contextId?: string;
	};
}

const handler = async (req: TomatoRequest, res: NextApiResponse) => {
	const session = await getSession(req, res);
	const tomatoService = new TomatoService(prisma, session);

	if (req.method === 'GET') {
		const tomatoes = await tomatoService.findManyForUser();
		res.statusCode = 200;
		res.json(tomatoes);
	} else if (req.method === 'POST') {
		await prisma.tomato.create({
			data: {
				description: req.body.description,
				deleted: false,
				contextId: req.body.contextId,
				authorId: session.user.sub
			}
		});

		const tomatoes = await tomatoService.findManyForUser();
		res.json(tomatoes);
	} else if (req.method === 'PUT') {
		await prisma.tomato.update({
			where: {
				id: req.body.id
			},
			data: {
				contextId: req.body.contextId
			}
		});

		const tomatoes = await tomatoService.findManyForUser();
		res.json(tomatoes);
	}
};

export default withApiAuthRequired(withSchemaValidation(schema, handler));
