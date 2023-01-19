import { NextApiHandler, NextApiResponse } from 'next';
import { OptionalObjectSchema, ObjectShape } from 'yup/lib/object';
import { TodoRequest } from '../pages/api/todo';

/**
 * This middleware validates the POST and PUTS coming into an API route
 * @param schema
 * @param handler
 * @returns
 */
export function withSchemaValidation(
	schema: OptionalObjectSchema<ObjectShape>,
	handler: NextApiHandler
) {
	return async (req: TodoRequest, res: NextApiResponse) => {
		if (['POST', 'PUT'].includes(req.method)) {
			try {
				await schema.validate(req.body);
			} catch (error) {
				return res.status(400).json(error);
			}
		}

		await handler(req, res);
	};
}
