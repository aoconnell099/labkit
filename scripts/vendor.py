"""Copy labkit's files into an app that has no build, at a pinned commit.

    python ../labkit/scripts/vendor.py --to web/vendor/labkit --at <sha>
    python ../labkit/scripts/vendor.py --to web/vendor/labkit --path src/tokens.css --path src/kit
    python ../labkit/scripts/vendor.py --check web/vendor/labkit

The files come out of this clone's git at the commit (`git ls-tree`, `git show`),
never the working tree and never the network. Each lands under the target folder
at its path below `src/` (`src/tokens.css` -> `<dir>/tokens.css`), and
`<dir>/VENDORED.json` records the full commit, the paths asked for and each
file's sha256. A file the last copy wrote that this one does not is removed.

`--check <dir>` exits 1, naming the file, when one listed in VENDORED.json is
missing or changed; otherwise it prints `VENDOR-CHECK ok <commit>`.

stdlib only. See docs/vendoring.md.
"""
import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = 'VENDORED.json'
DEFAULT_AT = 'origin/main'
DEFAULT_PATHS = ['src/tokens.css']


class VendorError(Exception):
    pass


def git(repo, *args):
    """A git command's stdout as bytes; a VendorError with its stderr when it fails."""
    done = subprocess.run(['git', *args], cwd=repo, capture_output=True)
    if done.returncode != 0:
        raise VendorError(f'git {" ".join(args)}: ' + done.stderr.decode('utf-8', 'replace').strip())
    return done.stdout


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def target_name(path):
    """Where a labkit path lands under the target folder: its path below `src/`."""
    return path[len('src/'):] if path.startswith('src/') else path


def files_at(repo, commit, paths):
    """{labkit file path: blob contents} for every file under each path at the commit."""
    found = {}
    for path in paths:
        path = path.strip('/')
        listed = git(repo, 'ls-tree', '-r', '-z', commit, '--', path).decode('utf-8')
        entries = [e for e in listed.split('\0') if e]
        if not entries:
            raise VendorError(f'{path} is not in labkit at {commit}')
        for entry in entries:
            meta, name = entry.split('\t', 1)
            if meta.split()[1] != 'blob':
                continue
            found[name] = git(repo, 'show', f'{commit}:{name}')
    return found


def read_manifest(dest):
    path = Path(dest) / MANIFEST
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding='utf-8'))


def vendor(dest, at=DEFAULT_AT, paths=None, repo=ROOT):
    """Copy `paths` at `at` into `dest`; returns the manifest it wrote."""
    paths = list(paths or DEFAULT_PATHS)
    dest = Path(dest)
    try:
        commit = git(repo, 'rev-parse', '--verify', '-q', at + '^{commit}').decode().strip()
    except VendorError:
        raise VendorError(f'{at} is not a commit in this labkit clone') from None
    blobs = files_at(repo, commit, paths)
    files = {}
    for name, data in sorted(blobs.items()):
        rel = target_name(name)
        if rel == MANIFEST:
            raise VendorError(f'{name} would overwrite {MANIFEST}')
        out = dest / rel
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_bytes(data)
        files[rel] = sha256(data)

    before = read_manifest(dest)
    for rel in sorted((before or {}).get('files', {})):
        if rel in files:
            continue
        old = dest / rel
        if old.is_file():
            old.unlink()
        # Folders the old copy made and nothing now fills go too, up to the target.
        parent = old.parent
        while parent != dest and parent.is_dir() and not any(parent.iterdir()):
            parent.rmdir()
            parent = parent.parent

    manifest = {'commit': commit, 'paths': paths, 'files': files}
    (dest / MANIFEST).write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8', newline='\n')
    return manifest


def check(dest):
    """The problems with a vendored folder, as sentences, and its commit."""
    manifest = read_manifest(dest)
    if manifest is None:
        return [f'{Path(dest) / MANIFEST} is missing'], None
    found = []
    for rel, want in sorted(manifest.get('files', {}).items()):
        path = Path(dest) / rel
        if not path.is_file():
            found.append(f'{rel} is missing')
        elif sha256(path.read_bytes()) != want:
            found.append(f'{rel} differs from labkit at {manifest["commit"]}')
    return found, manifest.get('commit')


def main(argv=None):
    parser = argparse.ArgumentParser(description='Copy labkit files into an app at a pinned commit.')
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--to', metavar='DIR', help='the folder to copy into')
    mode.add_argument('--check', metavar='DIR', help='check a vendored folder against its VENDORED.json')
    parser.add_argument('--at', default=DEFAULT_AT, metavar='COMMIT', help=f'the commit to copy from (default {DEFAULT_AT})')
    parser.add_argument('--path', action='append', metavar='PATH',
                        help='a labkit file or folder to copy; repeatable (default src/tokens.css)')
    args = parser.parse_args(argv)

    if args.check:
        found, commit = check(args.check)
        for f in found:
            print('VENDOR-CHECK FAIL: ' + f)
        if found:
            return 1
        print(f'VENDOR-CHECK ok {commit}')
        return 0

    try:
        manifest = vendor(args.to, args.at, args.path)
    except VendorError as e:
        print('vendor: ' + str(e), file=sys.stderr)
        return 1
    for rel in manifest['files']:
        print(rel)
    print(f'vendored {len(manifest["files"])} file(s) at {manifest["commit"]} into {args.to}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
