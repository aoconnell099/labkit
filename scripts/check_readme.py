"""Keep the README short, and keep what it once said.

Prints the README's line count and fails when
  1. it is over MAX_LINES, or
  2. a paragraph of main's README (`git show main:README.md`) appears neither in
     README.md nor in docs/*.md, so a trim that deletes notes is caught.

Run from anywhere: `python scripts/check_readme.py`.
"""
import re
import subprocess
import sys
from pathlib import Path

MAX_LINES = 300
ROOT = Path(__file__).resolve().parent.parent


def squash(text):
    """Whitespace collapsed, so a re-wrapped paragraph still counts as the same one."""
    return re.sub(r'\s+', ' ', text).strip()


def paragraphs(text):
    return [p for p in (squash(p) for p in re.split(r'\n\s*\n', text)) if p]


def line_count(text):
    return len(text.splitlines())


def problems(readme, main_readme, docs):
    """The failures, as sentences; an empty list means ok."""
    found = []
    n = line_count(readme)
    if n > MAX_LINES:
        found.append(f'README.md is {n} lines, over the {MAX_LINES} allowed')
    kept = squash(readme) + ' ' + ' '.join(squash(d) for d in docs)
    for p in paragraphs(main_readme):
        if p not in kept:
            found.append(f'a paragraph of main\'s README is in neither README.md nor docs/*.md: {p[:80]}...')
    return found


def base_ref():
    """`main`, or `origin/main` when that is ahead of it: a clone that cannot fetch
    or pull keeps a stale local main, and the README to hold to is the newer."""
    def git(*args):
        return subprocess.run(['git', *args], cwd=ROOT, capture_output=True).returncode
    if git('rev-parse', '--verify', '-q', 'origin/main') == 0 \
            and git('merge-base', '--is-ancestor', 'main', 'origin/main') == 0:
        return 'origin/main'
    return 'main'


def main():
    readme = (ROOT / 'README.md').read_text(encoding='utf-8')
    docs = [p.read_text(encoding='utf-8') for p in sorted((ROOT / 'docs').glob('*.md'))]
    ref = base_ref()
    shown = subprocess.run(['git', 'show', ref + ':README.md'], cwd=ROOT,
                           capture_output=True, text=True, encoding='utf-8')
    if shown.returncode != 0:
        print(f'could not read {ref}:README.md: ' + shown.stderr.strip())
        return 1
    print(f'README.md: {line_count(readme)} lines (at most {MAX_LINES})')
    found = problems(readme, shown.stdout, docs)
    for f in found:
        print('FAIL: ' + f)
    if not found:
        print('ok')
    return 1 if found else 0


if __name__ == '__main__':
    sys.exit(main())
