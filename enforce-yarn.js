const isUsingNpm = process.env.npm_execpath?.includes('npm');
const isUsingYarn = process.env.npm_execpath?.includes('yarn');

if (isUsingNpm && !isUsingYarn) {
	console.error(`
🚫 This project uses Yarn as the package manager.
Please run \`yarn install\` instead of \`npm install\`.
  `);
	process.exit(1);
}
