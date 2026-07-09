import fs from "fs";
import path from "path";

const checkDirs = ["/app/cloudsql", "/cloudsql", "/tmp", "/var/run/postgresql", "/var/run"];

console.log("Searching for PostgreSQL socket files...");

function searchDir(dir: string, depth = 0) {
  if (depth > 3) return;
  try {
    if (!fs.existsSync(dir)) {
      return;
    }
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const fullPath = path.join(dir, f);
      try {
        const stat = fs.lstatSync(fullPath);
        if (stat.isSymbolicLink()) {
          console.log(`[LINK] ${fullPath}`);
        } else if (stat.isDirectory()) {
          searchDir(fullPath, depth + 1);
        } else if (f.includes("PGSQL") || stat.isSocket()) {
          console.log(`[FOUND SOCKET/PGSQL] ${fullPath} - IsSocket: ${stat.isSocket()}`);
        }
      } catch (err) {
        // ignore
      }
    }
  } catch (err) {
    // ignore
  }
}

for (const d of checkDirs) {
  console.log(`Checking ${d}...`);
  searchDir(d);
}

console.log("Done searching.");
