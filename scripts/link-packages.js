"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const url_1 = require("url");
const glob_1 = require("glob");
// @ts-expect-error - TS1470: We only run this script with tsx so it will never
// compile to CJS and it's safe to ignore this tsc error.
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path.dirname(__filename);
const config = {
    packages: [
        {
            name: "@roo-code/cloud",
            sourcePath: "../Roo-Code-Cloud/packages/sdk",
            targetPaths: ["src/node_modules/@roo-code/cloud"],
            replacePath: "node_modules/.pnpm/@roo-code+cloud*",
            npmPath: "npm",
            watchCommand: "pnpm build:development:watch",
            watchOutput: {
                start: ["CLI Building", "CLI Change detected"],
                stop: ["DTS ⚡️ Build success"],
            },
        },
    ],
};
const args = process.argv.slice(2);
const packageName = args.find((arg) => !arg.startsWith("--"));
const watchMode = !args.includes("--no-watch");
const unlink = args.includes("--unlink");
const packages = packageName
    ? config.packages.filter((p) => p.name === packageName)
    : config.packages;
if (!packages.length) {
    console.error(`Package '${packageName}' not found`);
    process.exit(1);
}
function pathExists(filePath) {
    try {
        fs.accessSync(filePath);
        return true;
    }
    catch {
        return false;
    }
}
function copyRecursiveSync(src, dest) {
    const exists = pathExists(src);
    if (!exists) {
        return;
    }
    const stats = fs.statSync(src);
    const isDirectory = stats.isDirectory();
    if (isDirectory) {
        if (!pathExists(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        const children = fs.readdirSync(src);
        children.forEach((childItemName) => {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
    }
    else {
        fs.copyFileSync(src, dest);
    }
}
function generateNpmPackageJson(sourcePath, npmPath) {
    const npmDir = path.join(sourcePath, npmPath);
    const npmPackagePath = path.join(npmDir, "package.json");
    const npmMetadataPath = path.join(npmDir, "package.metadata.json");
    const monorepoPackagePath = path.join(sourcePath, "package.json");
    if (pathExists(npmPackagePath)) {
        return npmPackagePath;
    }
    if (!pathExists(npmMetadataPath)) {
        throw new Error(`No package.metadata.json found in ${npmDir}`);
    }
    const monorepoPackageContent = fs.readFileSync(monorepoPackagePath, "utf8");
    const monorepoPackage = JSON.parse(monorepoPackageContent);
    const npmMetadataContent = fs.readFileSync(npmMetadataPath, "utf8");
    const npmMetadata = JSON.parse(npmMetadataContent);
    const npmPackage = {
        ...npmMetadata,
        type: "module",
        dependencies: monorepoPackage.dependencies || {},
        main: "./dist/index.cjs",
        module: "./dist/index.js",
        types: "./dist/index.d.ts",
        exports: {
            ".": {
                types: "./dist/index.d.ts",
                import: "./dist/index.js",
                require: {
                    types: "./dist/index.d.cts",
                    default: "./dist/index.cjs",
                },
            },
        },
        files: ["dist"],
    };
    fs.writeFileSync(npmPackagePath, JSON.stringify(npmPackage, null, 2) + "\n");
    return npmPackagePath;
}
function linkPackage(pkg) {
    const sourcePath = path.resolve(__dirname, "..", pkg.sourcePath);
    if (!pathExists(sourcePath)) {
        console.error(`❌ Source not found: ${sourcePath}`);
        process.exit(1);
    }
    generateNpmPackageJson(sourcePath, pkg.npmPath);
    for (const currentTargetPath of pkg.targetPaths) {
        const targetPath = path.resolve(__dirname, "..", currentTargetPath);
        if (pathExists(targetPath)) {
            fs.rmSync(targetPath, { recursive: true, force: true });
        }
        const parentDir = path.dirname(targetPath);
        fs.mkdirSync(parentDir, { recursive: true });
        const linkSource = pkg.npmPath ? path.join(sourcePath, pkg.npmPath) : sourcePath;
        copyRecursiveSync(linkSource, targetPath);
    }
}
function unlinkPackage(pkg) {
    for (const currentTargetPath of pkg.targetPaths) {
        const targetPath = path.resolve(__dirname, "..", currentTargetPath);
        if (pathExists(targetPath)) {
            fs.rmSync(targetPath, { recursive: true, force: true });
            console.log(`🗑️  Removed ${pkg.name} from ${currentTargetPath}`);
        }
    }
}
function startWatch(pkg) {
    if (!pkg.watchCommand) {
        throw new Error(`Package ${pkg.name} has no watch command configured`);
    }
    const commandParts = pkg.watchCommand.split(" ");
    const [cmd, ...args] = commandParts;
    if (!cmd) {
        throw new Error(`Invalid watch command for ${pkg.name}`);
    }
    console.log(`👀 Watching for changes to ${pkg.sourcePath} with ${cmd} ${args.join(" ")}`);
    const child = (0, child_process_1.spawn)(cmd, args, {
        cwd: path.resolve(__dirname, "..", pkg.sourcePath),
        stdio: "pipe",
        shell: true,
    });
    let debounceTimer = null;
    const DEBOUNCE_DELAY = 500;
    if (child.stdout) {
        child.stdout.on("data", (data) => {
            const output = data.toString();
            const isStarting = pkg.watchOutput?.start.some((start) => output.includes(start));
            const isDone = pkg.watchOutput?.stop.some((stop) => output.includes(stop));
            if (isStarting) {
                console.log(`🔨 Building ${pkg.name}...`);
                if (debounceTimer) {
                    clearTimeout(debounceTimer);
                    debounceTimer = null;
                }
            }
            if (isDone) {
                console.log(`✅ Built ${pkg.name}`);
                if (debounceTimer) {
                    clearTimeout(debounceTimer);
                }
                debounceTimer = setTimeout(() => {
                    linkPackage(pkg);
                    console.log(`♻️ Copied ${pkg.name} to ${pkg.targetPaths.length} paths\n`);
                    debounceTimer = null;
                }, DEBOUNCE_DELAY);
            }
        });
    }
    if (child.stderr) {
        child.stderr.on("data", (data) => {
            console.log(`❌ "${data.toString()}"`);
        });
    }
    return { child };
}
function main() {
    if (unlink) {
        packages.forEach(unlinkPackage);
        console.log("\n📦 Restoring npm packages...");
        try {
            (0, child_process_1.execSync)("pnpm install", { cwd: __dirname, stdio: "ignore" });
            console.log("✅ npm packages restored");
        }
        catch (error) {
            console.error(`❌ Failed to restore packages: ${error instanceof Error ? error.message : String(error)}`);
            console.log("   Run 'pnpm install' manually if needed");
        }
    }
    else {
        packages.forEach((pkg) => {
            linkPackage(pkg);
            if (pkg.replacePath) {
                const replacePattern = path.resolve(__dirname, "..", pkg.replacePath);
                try {
                    const matchedPaths = glob_1.glob.sync(replacePattern);
                    if (matchedPaths.length > 0) {
                        matchedPaths.forEach((matchedPath) => {
                            if (pathExists(matchedPath)) {
                                fs.rmSync(matchedPath, { recursive: true, force: true });
                                console.log(`🗑️  Removed ${pkg.name} from ${matchedPath}`);
                            }
                        });
                    }
                    else {
                        if (pathExists(replacePattern)) {
                            fs.rmSync(replacePattern, { recursive: true, force: true });
                            console.log(`🗑️  Removed ${pkg.name} from ${replacePattern}`);
                        }
                    }
                }
                catch (error) {
                    console.error(`❌ Error processing replace path: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        });
        if (watchMode) {
            const packagesWithWatch = packages.filter((pkg) => pkg.watchCommand !== undefined);
            const watchers = packagesWithWatch.map(startWatch);
            if (watchers.length > 0) {
                process.on("SIGINT", () => {
                    console.log("\n👋 Stopping watchers...");
                    watchers.forEach((w) => {
                        if (w.child) {
                            w.child.kill();
                        }
                    });
                    process.exit(0);
                });
            }
        }
    }
}
main();
