/** The comps' screens, by hash: `#/` the home, `#/piece/<id>` a piece's page,
 *  and Workbench's `#/sample`. A hash, so each comp stays one static page in the
 *  preview. */
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
  /** Workbench's sample screen, `#/sample`: the pieces as one app page. */
  get sample(): boolean {
    return hash === SAMPLE;
  },
};

export const hrefOf = (id: string | null) => (id ? `#/piece/${id}` : '#/');
export const SAMPLE = '#/sample';
