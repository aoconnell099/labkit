import io
import json
import subprocess
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'scripts'))
import vendor  # noqa: E402


def git(repo, *args):
    return subprocess.run(['git', '-c', 'user.name=test', '-c', 'user.email=test@example.invalid', *args],
                          cwd=repo, capture_output=True, text=True, check=True).stdout.strip()


def commit(repo, files, removed=()):
    """Write `files` ({path: text}), delete `removed`, commit; returns the sha."""
    for path, text in files.items():
        p = Path(repo) / path
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(text.encode('utf-8'))
    for path in removed:
        git(repo, 'rm', '-q', path)
    git(repo, 'add', '-A')
    git(repo, 'commit', '-q', '-m', 'test')
    return git(repo, 'rev-parse', 'HEAD')


class Vendor(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.repo = Path(tmp.name) / 'labkit'
        self.dest = Path(tmp.name) / 'app' / 'vendor' / 'labkit'
        self.repo.mkdir()
        git(self.repo, 'init', '-q')
        self.first = commit(self.repo, {
            'src/tokens.css': ':root { --space-1: 4px; }\n',
            'src/kit/button.js': 'export const button = 1;\n',
            'src/kit/parts/rail.js': 'export const rail = 1;\n',
            'README.md': 'not vendored\n',
        })

    def check(self):
        out = io.StringIO()
        with redirect_stdout(out):
            code = vendor.main(['--check', str(self.dest)])
        return code, out.getvalue()

    def test_copies_one_file_below_src(self):
        manifest = vendor.vendor(self.dest, self.first, repo=self.repo)
        self.assertEqual((self.dest / 'tokens.css').read_text(), ':root { --space-1: 4px; }\n')
        self.assertEqual(sorted(p.name for p in self.dest.iterdir()), ['VENDORED.json', 'tokens.css'])
        written = json.loads((self.dest / 'VENDORED.json').read_text())
        self.assertEqual(written, manifest)
        self.assertEqual(written['commit'], self.first)
        self.assertEqual(written['paths'], ['src/tokens.css'])
        self.assertEqual(list(written['files']), ['tokens.css'])
        self.assertEqual(written['files']['tokens.css'], vendor.sha256(b':root { --space-1: 4px; }\n'))

    def test_copies_a_folder_keeping_its_layout(self):
        manifest = vendor.vendor(self.dest, self.first, ['src/kit'], repo=self.repo)
        self.assertEqual(sorted(manifest['files']), ['kit/button.js', 'kit/parts/rail.js'])
        self.assertEqual((self.dest / 'kit' / 'parts' / 'rail.js').read_text(), 'export const rail = 1;\n')
        self.assertFalse((self.dest / 'tokens.css').exists())

    def test_reads_git_not_the_working_tree(self):
        (self.repo / 'src' / 'tokens.css').write_text('uncommitted\n')
        vendor.vendor(self.dest, self.first, repo=self.repo)
        self.assertEqual((self.dest / 'tokens.css').read_text(), ':root { --space-1: 4px; }\n')

    def test_check_passes_on_a_fresh_copy(self):
        vendor.vendor(self.dest, self.first, ['src/tokens.css', 'src/kit'], repo=self.repo)
        code, out = self.check()
        self.assertEqual(code, 0)
        self.assertEqual(out.strip(), f'VENDOR-CHECK ok {self.first}')

    def test_check_fails_on_an_edited_file(self):
        vendor.vendor(self.dest, self.first, ['src/tokens.css', 'src/kit'], repo=self.repo)
        (self.dest / 'kit' / 'button.js').write_text('edited\n')
        code, out = self.check()
        self.assertEqual(code, 1)
        self.assertIn('kit/button.js differs', out)
        self.assertNotIn('ok', out)

    def test_check_fails_on_a_missing_file(self):
        vendor.vendor(self.dest, self.first, repo=self.repo)
        (self.dest / 'tokens.css').unlink()
        code, out = self.check()
        self.assertEqual(code, 1)
        self.assertIn('tokens.css is missing', out)

    def test_a_second_copy_at_another_commit_removes_what_it_no_longer_has(self):
        vendor.vendor(self.dest, self.first, ['src/tokens.css', 'src/kit'], repo=self.repo)
        second = commit(self.repo, {'src/kit/button.js': 'export const button = 2;\n'},
                        removed=['src/kit/parts/rail.js'])
        manifest = vendor.vendor(self.dest, second, ['src/tokens.css', 'src/kit'], repo=self.repo)
        self.assertEqual(manifest['commit'], second)
        self.assertEqual(sorted(manifest['files']), ['kit/button.js', 'tokens.css'])
        self.assertFalse((self.dest / 'kit' / 'parts' / 'rail.js').exists())
        self.assertFalse((self.dest / 'kit' / 'parts').exists())
        self.assertEqual((self.dest / 'kit' / 'button.js').read_text(), 'export const button = 2;\n')
        self.assertEqual(self.check()[0], 0)

    def test_an_unknown_commit_or_path_is_an_error(self):
        with self.assertRaises(vendor.VendorError):
            vendor.vendor(self.dest, 'no-such-ref', repo=self.repo)
        with self.assertRaises(vendor.VendorError):
            vendor.vendor(self.dest, self.first, ['src/nothing.css'], repo=self.repo)


if __name__ == '__main__':
    unittest.main()
