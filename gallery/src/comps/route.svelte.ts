/** The comps' two screens, by hash: `#/` the home, `#/piece/<id>` a piece's
 *  page. A hash, so each comp stays one static page in the preview. */
import { piece } from './catalog';

let hash = $state(location.hash);
addEventListener('hashchange', () => {
  hash = location.hash;
  scrollTo(0, 0);
});

export const route = {
  /** The open piece's id, or null on the home (an unknown id is the home too). */
  get piece(): string | null {
    const id = /^#\/piece\/([\w-]+)/.exec(hash)?.[1];
    return id && piece(id) ? id : null;
  },
};

export const hrefOf = (id: string | null) => (id ? `#/piece/${id}` : '#/');
