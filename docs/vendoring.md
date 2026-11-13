# Vendoring labkit into an app with no build

An app that serves plain files, with no bundler and no `npm install`, cannot take
labkit as a package. It takes labkit by copying its files in, and
`scripts/vendor.py` is the one way to do that. It is stdlib Python, so the app
needs nothing installed beyond Python and git.

## Take labkit

Clone labkit beside the app (`lab/labkit` next to `lab/<app>`), then from the
app's folder:

```bash
python ../labkit/scripts/vendor.py --to web/vendor/labkit --at <sha>
```

- `--at` is the commit to copy from. Leave it out and it is `origin/main`, but an
  app should always pass a full sha: that sha is the app's pin.
- `--path` names a labkit file or folder, and can be given more than once. Left out,
  it is `src/tokens.css`. A folder such as `src/kit` copies every file under it,
  keeping their layout.
- Each file lands at its path below `src/`: `src/tokens.css` becomes
  `web/vendor/labkit/tokens.css`, `src/kit/button.js` becomes
  `web/vendor/labkit/kit/button.js`.
- Beside them it writes `VENDORED.json`: the full commit, the paths asked for, and
  each file's sha256.

The files come out of labkit's git at that commit (`git ls-tree`, `git show`).
Never the working tree, so labkit's uncommitted edits never leak into an app; and
never the network, so it cannot fetch. If the commit is newer than the clone,
`git fetch` in labkit first.

Commit the copied files and `VENDORED.json` in the app. The app serves them as its
own files.

## Check it

```bash
python ../labkit/scripts/vendor.py --check web/vendor/labkit
```

It prints `VENDOR-CHECK ok <commit>`, or names each file that is missing or no
longer matches its sha256 and exits 1. An app's own checks can run it, so a hand
edit to a vendored file is caught: change labkit instead, then move the pin.

## Move the pin

1. In labkit's clone, `git fetch`, and pick the commit to move to.
2. From the app, run the same command with the new `--at <sha>` and the same
   `--path`s.
3. A file the last copy wrote and the new one does not have is removed, so nothing
   stale stays behind. Read the app's diff, try the app, and commit the files and
   `VENDORED.json` together.

## Why the pin is a commit

labkit has no releases and no version numbers, the same as for apps that install it
with npm (the README's Use section): a git dependency's version is the commit its
lockfile names. A vendored copy is pinned the same way, and `VENDORED.json` is its
lockfile. A branch name would mean the next copy takes whatever `main` happens to be
that day, and two apps vendored an hour apart would quietly differ. A commit means
the app changes only when someone moves its pin, on purpose, in a commit of its own.
