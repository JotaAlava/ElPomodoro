import { getSession } from '@auth0/nextjs-auth0';
import { withPageAuthRequired } from '@auth0/nextjs-auth0';
import { Context, PrismaClient, Tomato } from '@prisma/client';
import { useState } from 'react';
import { AppContext } from '../../components/AppContext';
import Layout from '../../components/Layout';
import NewRow from '../../components/NewRow';
import TomatoTimer from '../../components/TomatoTimer';
import ContextsList from '../../components/ContextsList';

export const getServerSideProps = withPageAuthRequired({
	returnTo: '/',
	async getServerSideProps(ctx) {
		const session = await getSession(ctx.req, ctx.res);
		const prisma = new PrismaClient();

		const contexts = await prisma.context.findMany({
			where: {
				authorId: {
					equals: session.user.sub
				}
			}
		});

		return {
			props: {
				contexts
			}
		};
	}
});

export default function ContextMain({ user, contexts }) {
	const [isEdit, setIsEdit] = useState<Context>(undefined);
	const [loadedContexts, setLoadedContexts] =
		useState<Array<Context>>(contexts);

	const onSave = (newTomatoes: Array<Tomato>) => {
		setLoadedContexts(newTomatoes);
	};

	const editForm = async (val) => {
		val.preventDefault();

		const response = await fetch(`/api/context`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				...isEdit,
				description: val.target[0].value
			})
		});

		const result = await response.json();
		setLoadedContexts(result);
		setIsEdit(undefined);
	};

	const deleteContext = async (context: Context) => {
		const response = await fetch(`/api/context`, {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				id: context.id
			})
		});

		const result = await response.json();
		setLoadedContexts(result);
		setIsEdit(undefined);
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
					<h1>New Context</h1>
					{isEdit ? (
						<div className="row pb-lg-4">
							<div className="col-sm">
								<form onSubmit={editForm}>
									<div className="input-group mb-3">
										<div className="input-group-prepend">
											<span
												className="input-group-text"
												id="inputGroup-sizing-default"
											>
												Description
											</span>
										</div>
										<input
											type="text"
											className="form-control"
											aria-label="Default"
											aria-describedby="inputGroup-sizing-default"
											maxLength={255}
											required
											defaultValue={isEdit.description}
										/>

										<button type="submit" className="btn btn-primary">
											Update
										</button>
										<button
											className="btn btn-danger"
											onClick={() => {
												setIsEdit(undefined);
											}}
										>
											Cancel
										</button>
									</div>
								</form>
							</div>
						</div>
					) : (
						<NewRow field="context" onSubmit={onSave}></NewRow>
					)}
					<ContextsList
						contexts={loadedContexts}
						edit={setIsEdit}
						del={deleteContext}
					></ContextsList>
				</div>
			</Layout>
		</AppContext.Provider>
	);
}
