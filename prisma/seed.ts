import { PrismaClient, Tomato } from '@prisma/client';

// TODO: Fix this!

const prisma = new PrismaClient();

async function main() {
	// const seedContext = await prisma.context.upsert({
	// 	create: undefined,
	// 	where: undefined,
	// 	update: undefined
	// });

	console.log('seedContext');
}

main()
	.then(async () => {
		await prisma.$disconnect();
	})
	.catch(async (e) => {
		console.error(e);
		await prisma.$disconnect();
		process.exit(1);
	});
