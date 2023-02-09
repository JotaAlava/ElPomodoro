import { PrismaClient, Tomato } from '@prisma/client';

const prisma = new PrismaClient();
export const loadTodos = async (userSub) => {
	const orderByClause: any = {
		where: {
			authorId: {
				equals: userSub
			}
		},
		orderBy: [
			{
				dueDate: 'asc'
			},
			{
				created: 'desc'
			}
		]
	};

	const todos = await prisma.todo.findMany(orderByClause);

	return todos.map((todo) => {
		return {
			...todo,
			created: Math.floor((todo.created as any) / 1000)
		};
	});
};
