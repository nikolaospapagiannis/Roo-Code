import * as esbuild from "esbuild"
import * as fs from "fs"
import * as path from "path"
import { fileURLToPath } from "url"
import process from "node:process"
import * as console from "node:console"

import { copyPaths, copyWasms, copyLocales, setupLocaleWatcher } from "@founder-x-ai/build"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function main() {
	const name = "extension"
	const production = process.argv.includes("--production")
	const watch = process.argv.includes("--watch")
	const minify = production
	const sourcemap = true // Always generate source maps for error handling

	/**
	 * @type {import('esbuild').BuildOptions}
	 */
	const buildOptions = {
		bundle: true,
		minify,
		sourcemap,
		logLevel: "silent",
		format: "cjs",
		sourcesContent: false,
		platform: "node",
	}

	const srcDir = __dirname
	const buildDir = __dirname
	const distDir = path.join(buildDir, "dist")

	if (fs.existsSync(distDir)) {
		console.log(`[${name}] Cleaning dist directory: ${distDir}`)
		fs.rmSync(distDir, { recursive: true, force: true })
	}

	/**
	 * @type {import('esbuild').Plugin[]}
	 */
	const plugins = [
		{
			name: "copyFiles",
			setup(build) {
				build.onEnd(() => {
					copyPaths(
						[
							["../README.md", "README.md"],
							["../CHANGELOG.md", "CHANGELOG.md"],
							["../LICENSE", "LICENSE"],
							["../.env", ".env", { optional: true }],
							["node_modules/vscode-material-icons/generated", "assets/vscode-material-icons"],
							["../webview-ui/audio", "webview-ui/audio"],
						],
						srcDir,
						buildDir,
					)
				})
			},
		},
		{
			name: "copyWasms",
			setup(build) {
				build.onEnd(() => copyWasms(srcDir, distDir))
			},
		},
		{
			name: "copyLocales",
			setup(build) {
				build.onEnd(() => copyLocales(srcDir, distDir))
			},
		},
		{
			name: "esbuild-problem-matcher",
			setup(build) {
				build.onStart(() => console.log("[esbuild-problem-matcher#onStart]"))
				build.onEnd((result) => {
					result.errors.forEach(({ text, location }) => {
						console.error(`✘ [ERROR] ${text}`)
						if (location && location.file) {
							console.error(`    ${location.file}:${location.line}:${location.column}:`)
						}
					})

					console.log("[esbuild-problem-matcher#onEnd]")
				})
			},
		},
	]

	/**
	 * @type {import('esbuild').BuildOptions}
	 */
	const extensionConfig = {
		...buildOptions,
		plugins,
		entryPoints: ["extension.ts"],
		outfile: "dist/extension.js",
		external: [
			"vscode",
			// Fortune 100 native modules (should not be bundled)
			"pg",
			"pg-native",
			"ioredis",
			"bcrypt",
			"speakeasy",
			"tiktoken",  // WASM-based, already copied separately
			// Optional heavy dependencies
			"@grpc/grpc-js",
			"@grpc/proto-loader",
			"canvas",
			"sharp",
			"sqlite3",
			"better-sqlite3",
		],
		// Enable tree shaking
		treeShaking: true,
		// Mangle private properties for smaller bundle (only in production)
		mangleProps: production ? /^_private_/ : undefined,
		// Drop console/debugger in production
		drop: production ? ['console', 'debugger'] : [],
		// Minification settings (more aggressive in production)
		minifyWhitespace: production,
		minifyIdentifiers: production,
		minifySyntax: production,
		// Generate metafile for bundle analysis
		metafile: true,
	}

	/**
	 * @type {import('esbuild').BuildOptions}
	 */
	const workerConfig = {
		...buildOptions,
		entryPoints: ["workers/countTokens.ts"],
		outdir: "dist/workers",
		treeShaking: true,
		metafile: true,
	}

	const [extensionCtx, workerCtx] = await Promise.all([
		esbuild.context(extensionConfig),
		esbuild.context(workerConfig),
	])

	if (watch) {
		await Promise.all([extensionCtx.watch(), workerCtx.watch()])
		copyLocales(srcDir, distDir)
		setupLocaleWatcher(srcDir, distDir)
	} else {
		const [extensionResult, workerResult] = await Promise.all([
			extensionCtx.rebuild(),
			workerCtx.rebuild()
		])

		// Print bundle size and save metafile
		if (extensionResult.metafile) {
			const metafilePath = path.join(distDir, 'meta.json')
			fs.writeFileSync(metafilePath, JSON.stringify(extensionResult.metafile))

			const size = fs.statSync(path.join(distDir, 'extension.js')).size
			const sizeMB = (size / 1024 / 1024).toFixed(2)

			console.log(`\n📦 Bundle size: ${sizeMB}MB`)

			if (size > 5 * 1024 * 1024) {
				console.warn(`⚠️  Warning: Bundle is larger than 5MB target`)
				console.log(`💡 Run 'npx source-map-explorer dist/extension.js' to analyze`)
			} else {
				console.log(`✅ Bundle size is within Fortune 100 limits (<5MB)`)
			}
		}

		await Promise.all([extensionCtx.dispose(), workerCtx.dispose()])
	}
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
