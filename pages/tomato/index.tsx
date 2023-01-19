import { useUser } from '@auth0/nextjs-auth0/client';
import { withPageAuthRequired } from '@auth0/nextjs-auth0/client';
import React, { useState } from 'react';
import Layout from '../../components/Layout';
import { AppContext } from '../../components/AppContext';
import Todo from '../../components/Todos';
import Tomatoes from '../../components/Tomatoes';
import ContextPicker from '../../components/ContextPicker';
import TomatoTimer from '../../components/TomatoTimer';
import NewRow from '../../components/NewRow';
import { Context, PrismaClient, Tomato } from '@prisma/client';
import { getSession } from '@auth0/nextjs-auth0';
import TomatoService from '../../services/tomatoService';

export async function getServerSideProps(ctx) {
	const session = await getSession(ctx.req, ctx.res);
	const prisma = new PrismaClient();

	const todos = await prisma.todo.findMany({
		take: 80, // This is two weeks worth of 10x performance
		where: {
			authorId: {
				equals: session.user.sub
			}
		}
	});

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

type Props = {
	tomatoes: Array<Tomato>;
};

export default withPageAuthRequired(function Profile({
	user,
	tomatoes,
	todos,
	contexts
}) {
	const { error, isLoading } = useUser();
	const [loadedTomatoes, setTomatoes] = useState<Array<Tomato>>(tomatoes);
	const [selectedContext, setSelectedContext] = useState<Context>(undefined);

	const onSave = (newTomatoes: Array<Tomato>) => {
		setTomatoes(newTomatoes);
	};

	const toIdName = (contexts: Array<Context>): { [id: string]: string } => {
		const result = {};

		contexts.forEach((ctx) => {
			result[ctx.id] = ctx.description;
		});

		return result;
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
						<Tomatoes
							tomatoes={loadedTomatoes}
							contexts={toIdName(contexts)}
							selectedContext={selectedContext}
							reAssignedContext={onSave}
						></Tomatoes>
						<Todo todos={todos}></Todo>
					</div>
				</div>
			</Layout>
		</AppContext.Provider>
	);
});
