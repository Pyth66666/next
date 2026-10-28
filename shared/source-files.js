// Which source files are read for tutoring. Shared by the server (GitHub and upload imports)
// and the browser (picking files out of an uploaded ZIP or folder) so both apply the same rules.
export function eligibleFile(path,size=0){return size<=30000&&!/(^|\/)(node_modules|vendor|dist|build|coverage|\.git)(\/|$)/i.test(path)&&!/(^|\/)(\.env(?:\..*)?|.*\.(?:pem|key|p12|pfx)|credentials(?:\..*)?|secrets(?:\..*)?|package-lock\.json|yarn\.lock|pnpm-lock\.yaml)$/i.test(path)&&/\.(js|jsx|ts|tsx|mjs|cjs|py|go|rs|java|php|rb|html|css|sql|prisma|json|md|yml|yaml|toml)$/i.test(path);}
