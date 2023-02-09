import React, { useState } from 'react';
import Layout from '../../components/Layout';
import { AppContext } from '../../components/AppContext';
import Todo, { IdName } from '../../components/Todos';
import Tomatoes from '../../components/Tomatoes';
import ContextPicker from '../../components/ContextPicker';
import TomatoTimer from '../../components/TomatoTimer';
import NewRow from '../../components/NewRow';
import { Context, PrismaClient, Tomato } from '@prisma/client';
import TomatoService from '../../services/tomatoService';
import { getSession, withPageAuthRequired } from '@auth0/nextjs-auth0';
import { loadTodos } from '../../services/todoService';

export const getServerSideProps = withPageAuthRequired({
	returnTo: '/',
	async getServerSideProps(ctx) {
		const session = await getSession(ctx.req, ctx.res);
		const prisma = new PrismaClient();

		const todos = await loadTodos(session.user.sub);

		const tomatoService = new TomatoService(prisma, session);
		const tomatoes = await tomatoService.findManyForUser();
		const contexts = await prisma.context.findMany({
			where: {
				authorId: {
					equals: session.user.sub
				}
			}
		});

		return {
			props: {
				contexts,
				tomatoes,
				todos
			}
		};
	}
});

const toIdName = (contexts: Array<Context>): { [id: string]: string } => {
	const result = {};

	contexts.forEach((ctx) => {
		result[ctx.id] = ctx.description;
	});

	return result;
};

export default function TomatoMain({ user, tomatoes, todos, contexts }) {
	const [loadedTomatoes, setTomatoes] = useState<Array<Tomato>>(tomatoes);
	const [selectedContext, setSelectedContext] = useState<Context>(undefined);
	const [idNameContexts, setIdNameContexts] = useState<IdName>(
		toIdName(contexts)
	);

	const onSave = (newTomatoes: Array<Tomato>) => {
		setTomatoes(newTomatoes);
	};

	return (
		<AppContext.Provider
			value={{
				user
			}}
		>
			<Layout>
				<TomatoTimer></TomatoTimer>
				<div className="container">
					<NewRow
						field="tomato"
						onSubmit={onSave}
						selectedContext={selectedContext}
					></NewRow>
					<ContextPicker
						contexts={contexts}
						contextSelected={setSelectedContext}
					></ContextPicker>
					<div className="row">
						<Todo
							todos={todos}
							contexts={idNameContexts}
							selectedContext={selectedContext}
						></Todo>
						<Tomatoes
							tomatoes={loadedTomatoes}
							contexts={idNameContexts}
							selectedContext={selectedContext}
							reAssignedContext={onSave}
						></Tomatoes>
					</div>
				</div>
			</Layout>
		</AppContext.Provider>
	);
}
