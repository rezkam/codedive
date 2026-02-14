import { describe, it, expect } from "vitest";
import { checkCommandSafety } from "./safe-bash.js";

describe("checkCommandSafety", () => {
	// ── Commands that SHOULD be blocked ──────────────────────────────

	describe("blocks file-modifying commands", () => {
		const blockedCommands = [
			// Output redirects
			{ cmd: "echo foo > file.txt", reason: "output redirect" },
			{ cmd: "echo foo >> file.txt", reason: "append redirect" },
			{ cmd: "cat a b > merged.txt", reason: "cat with redirect" },
			{ cmd: "sort data.csv > sorted.csv", reason: "sort with redirect" },

			// tee
			{ cmd: "echo hello | tee output.txt", reason: "tee to file" },
			{ cmd: "ls | tee -a log.txt", reason: "tee append" },

			// File deletion
			{ cmd: "rm file.txt", reason: "rm" },
			{ cmd: "rm -rf dir/", reason: "rm -rf" },
			{ cmd: "rm -f *.log", reason: "rm -f glob" },
			{ cmd: "rmdir empty_dir", reason: "rmdir" },
			{ cmd: "unlink file.txt", reason: "unlink" },
			{ cmd: "shred secret.key", reason: "shred" },

			// File move/copy
			{ cmd: "mv old.txt new.txt", reason: "mv" },
			{ cmd: "cp source.txt dest.txt", reason: "cp" },
			{ cmd: "cp -r src/ dst/", reason: "cp -r" },

			// File creation/modification
			{ cmd: "touch newfile.txt", reason: "touch" },
			{ cmd: "mkdir new_dir", reason: "mkdir" },
			{ cmd: "mkdir -p deep/nested/dir", reason: "mkdir -p" },
			{ cmd: "chmod +x script.sh", reason: "chmod" },
			{ cmd: "chown user:group file", reason: "chown" },
			{ cmd: "ln -s target link", reason: "ln" },
			{ cmd: "truncate -s 0 file.log", reason: "truncate" },

			// In-place editing
			{ cmd: "sed -i 's/old/new/' file.txt", reason: "sed -i" },
			{ cmd: "sed --in-place 's/a/b/' file", reason: "sed --in-place" },
			{ cmd: "perl -i -pe 's/foo/bar/' file", reason: "perl -i" },
			{ cmd: "perl --in-place -pe 's/a/b/' f", reason: "perl --in-place" },

			// Patch
			{ cmd: "patch < fix.patch", reason: "patch" },
			{ cmd: "patch -p1 < changes.diff", reason: "patch -p1" },

			// Git write operations
			{ cmd: 'git commit -m "msg"', reason: "git commit" },
			{ cmd: "git push origin main", reason: "git push" },
			{ cmd: "git merge feature", reason: "git merge" },
			{ cmd: "git rebase main", reason: "git rebase" },
			{ cmd: "git reset --hard HEAD~1", reason: "git reset" },
			{ cmd: "git stash", reason: "git stash" },
			{ cmd: "git cherry-pick abc123", reason: "git cherry-pick" },
			{ cmd: "git revert HEAD", reason: "git revert" },
			{ cmd: "git clean -fd", reason: "git clean" },
			{ cmd: "git rm file.txt", reason: "git rm" },
			{ cmd: "git mv old.txt new.txt", reason: "git mv" },
			{ cmd: "git branch -d feature", reason: "git branch -d" },
			{ cmd: "git branch -D feature", reason: "git branch -D" },

			// Package managers
			{ cmd: "npm install express", reason: "npm install" },
			{ cmd: "npm i lodash", reason: "npm i" },
			{ cmd: "npm ci", reason: "npm ci" },
			{ cmd: "npm uninstall pkg", reason: "npm uninstall" },
			{ cmd: "npm update", reason: "npm update" },
			{ cmd: "npm link", reason: "npm link" },
			{ cmd: "npm rebuild", reason: "npm rebuild" },
			{ cmd: "yarn add react", reason: "yarn add" },
			{ cmd: "yarn remove react", reason: "yarn remove" },
			{ cmd: "pnpm add react", reason: "pnpm add" },
			{ cmd: "pip install requests", reason: "pip install" },
			{ cmd: "cargo install ripgrep", reason: "cargo install" },
			{ cmd: "cargo build", reason: "cargo build" },

			// Build tools
			{ cmd: "make", reason: "make" },
			{ cmd: "make all", reason: "make all" },
			{ cmd: "cmake .", reason: "cmake" },

			// Inline script execution
			{ cmd: 'python -c "open(\'f\',\'w\')"', reason: "python -c" },
			{ cmd: 'python3 -c "import os"', reason: "python3 -c" },
			{ cmd: 'node -e "require(\'fs\').writeFileSync()"', reason: "node -e" },
			{ cmd: 'ruby -e "File.write(\'f\', \'x\')"', reason: "ruby -e" },

			// dd
			{ cmd: "dd if=/dev/zero of=file bs=1M count=1", reason: "dd" },

			// Download to file
			{ cmd: "curl -o output.html https://example.com", reason: "curl -o" },
			{ cmd: "curl --output file.zip https://example.com/f.zip", reason: "curl --output" },
			{ cmd: "wget https://example.com/file.tar.gz", reason: "wget" },

			// Compound commands with destructive parts
			{ cmd: "ls && rm file.txt", reason: "rm in compound" },
			{ cmd: "cat file.txt; echo done > log.txt", reason: "redirect in compound" },
		];

		for (const { cmd, reason } of blockedCommands) {
			it(`blocks: ${cmd} (${reason})`, () => {
				const result = checkCommandSafety(cmd);
				expect(result).not.toBeNull();
				expect(typeof result).toBe("string");
			});
		}
	});

	// ── Commands that SHOULD be allowed ──────────────────────────────

	describe("allows read-only commands", () => {
		const allowedCommands = [
			// File reading
			{ cmd: "cat file.txt", reason: "cat" },
			{ cmd: "cat -n file.txt", reason: "cat -n" },
			{ cmd: "head -n 10 file.txt", reason: "head" },
			{ cmd: "tail -20 file.txt", reason: "tail" },
			{ cmd: "less file.txt", reason: "less" },
			{ cmd: "more file.txt", reason: "more" },

			// Search
			{ cmd: "grep -r pattern .", reason: "grep" },
			{ cmd: "grep -rn 'function' src/", reason: "grep -rn" },
			{ cmd: "rg pattern", reason: "ripgrep" },
			{ cmd: "rg -l 'TODO' src/", reason: "ripgrep -l" },
			{ cmd: "ag 'pattern' .", reason: "silver searcher" },

			// File listing / finding
			{ cmd: "find . -name '*.ts'", reason: "find" },
			{ cmd: "find . -type f -name '*.json'", reason: "find -type f" },
			{ cmd: "ls -la", reason: "ls" },
			{ cmd: "ls -R src/", reason: "ls -R" },
			{ cmd: "tree src/", reason: "tree" },
			{ cmd: "file somefile", reason: "file" },

			// Text processing (non-destructive)
			{ cmd: "wc -l file.txt", reason: "wc" },
			{ cmd: "sort data.csv", reason: "sort (stdout only)" },
			{ cmd: "uniq data.txt", reason: "uniq" },
			{ cmd: "diff file1 file2", reason: "diff" },
			{ cmd: "comm file1 file2", reason: "comm" },

			// Disk info
			{ cmd: "du -sh .", reason: "du" },
			{ cmd: "df -h", reason: "df" },
			{ cmd: "stat file.txt", reason: "stat" },

			// Git read operations
			{ cmd: "git log --oneline", reason: "git log" },
			{ cmd: "git log --oneline -20", reason: "git log -20" },
			{ cmd: "git diff HEAD", reason: "git diff" },
			{ cmd: "git diff --stat", reason: "git diff --stat" },
			{ cmd: "git show abc123", reason: "git show" },
			{ cmd: "git status", reason: "git status" },
			{ cmd: "git branch", reason: "git branch (list)" },
			{ cmd: "git remote -v", reason: "git remote" },
			{ cmd: "git blame file.txt", reason: "git blame" },
			{ cmd: "git shortlog -sn", reason: "git shortlog" },

			// Environment
			{ cmd: "echo hello", reason: "echo (no redirect)" },
			{ cmd: "echo $PATH", reason: "echo env var" },
			{ cmd: "env | grep PATH", reason: "env pipe" },
			{ cmd: "which node", reason: "which" },
			{ cmd: "whoami", reason: "whoami" },
			{ cmd: "pwd", reason: "pwd" },
			{ cmd: "date", reason: "date" },
			{ cmd: "uname -a", reason: "uname" },

			// Process info
			{ cmd: "ps aux", reason: "ps" },

			// Curl without -o (just stdout)
			{ cmd: "curl https://example.com", reason: "curl stdout" },
			{ cmd: "curl -s https://api.example.com | jq .", reason: "curl pipe jq" },

			// Comments
			{ cmd: "# this is a comment", reason: "comment" },

			// Empty
			{ cmd: "", reason: "empty" },
			{ cmd: "   ", reason: "whitespace" },

			// make --dry-run (safe)
			{ cmd: "make -n", reason: "make dry run" },
			{ cmd: "make --dry-run", reason: "make --dry-run" },

			// npm read-only
			{ cmd: "npm list", reason: "npm list" },
			{ cmd: "npm outdated", reason: "npm outdated" },
			{ cmd: "npm run test", reason: "npm run (scripts)" },
			{ cmd: "npm view express", reason: "npm view" },

			// Piped processing (no file output)
			{ cmd: "cat file.txt | grep pattern | wc -l", reason: "pipe chain" },
			{ cmd: "find . -name '*.ts' | xargs grep 'import'", reason: "find pipe xargs grep" },
		];

		for (const { cmd, reason } of allowedCommands) {
			it(`allows: ${cmd} (${reason})`, () => {
				const result = checkCommandSafety(cmd);
				expect(result).toBeNull();
			});
		}
	});

	// ── Edge cases ───────────────────────────────────────────────────

	describe("edge cases", () => {
		it("returns a descriptive string when blocked", () => {
			const result = checkCommandSafety("rm -rf /");
			expect(result).toContain("rm");
		});

		it("returns null for safe commands", () => {
			expect(checkCommandSafety("ls")).toBeNull();
		});

		it("handles multiline commands", () => {
			// A multiline command where one line is destructive
			expect(checkCommandSafety("ls\nrm file")).not.toBeNull();
		});

		it("handles commands with extra whitespace", () => {
			expect(checkCommandSafety("  rm   -rf   dir/  ")).not.toBeNull();
		});
	});
});
