import { PrismaClient, Tomato } from '@prisma/client';
import { Session } from '@auth0/nextjs-auth0';

export type TomatoViewModel =
	| Omit<Tomato, 'finished'>
	| {
			finished: number;
	  };

class TomatoService {
	readonly prisma: PrismaClient;
	readonly session: Session;

	constructor(prisma: PrismaClient, session: Session) {
		this.prisma = prisma;
		this.session = session;
	}

	async findManyForUser(): Promise<Array<TomatoViewModel>> {
		const tomatoesWithDate = await this.prisma.tomato.findMany({
			take: 320, // This is two weeks worth of 10x performance
			where: {
				authorId: {
					equals: this.session.user.sub
				}
			},
			orderBy: [
				{
					finished: 'desc'
				}
			]
		});

		const tomatoes = tomatoesWithDate.map((tomato) => {
			return {
				...tomato,
				finished: Math.floor((tomato.finished as any) / 1000)
			};
		});

		return tomatoes;
	}
}

export default TomatoService;
