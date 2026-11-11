import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'scripts'))
import check_readme  # noqa: E402

MAIN = 'First paragraph.\n\nSecond one,\nwrapped over two lines.\n'


class CheckReadme(unittest.TestCase):
    def test_ok_when_short_and_every_paragraph_kept(self):
        self.assertEqual(check_readme.problems('First paragraph.\n', MAIN, ['Second one, wrapped over two lines.\n']), [])

    def test_fails_when_readme_is_over_the_line_limit(self):
        long_readme = 'First paragraph.\n\nSecond one, wrapped over two lines.\n' + 'x\n' * check_readme.MAX_LINES
        found = check_readme.problems(long_readme, MAIN, [])
        self.assertEqual(len(found), 1)
        self.assertIn('lines, over the', found[0])

    def test_fails_when_a_paragraph_of_main_is_nowhere(self):
        found = check_readme.problems('First paragraph.\n', MAIN, ['something else\n'])
        self.assertEqual(len(found), 1)
        self.assertIn('Second one', found[0])

    def test_the_limit_itself_passes(self):
        readme = 'First paragraph.\n\nSecond one, wrapped over two lines.\n'
        readme += 'y\n' * (check_readme.MAX_LINES - check_readme.line_count(readme))
        self.assertEqual(check_readme.line_count(readme), check_readme.MAX_LINES)
        self.assertEqual(check_readme.problems(readme, MAIN, []), [])


if __name__ == '__main__':
    unittest.main()
