import { redirect } from 'next/navigation';

/** /study is the section, not a page. Tapping Study in the menu lands
 *  on the timer, which is where a study session actually starts. */
export default function StudyIndex() {
  redirect('/study/timer');
}
