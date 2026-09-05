import type { Post, Topic } from '@/lib/blog/types';
import { post as answerSpace } from '@/content/posts/answer-space';
import { post as assignmentBriefFormat } from '@/content/posts/assignment-brief-format';
import { post as certificateLayout } from '@/content/posts/certificate-layout';
import { post as docxFormattingLoss } from '@/content/posts/docx-formatting-loss';
import { post as fontsForQuestionPapers } from '@/content/posts/fonts-for-question-papers';
import { post as generalInstructions } from '@/content/posts/general-instructions';
import { post as marginsAndPageSetup } from '@/content/posts/margins-and-page-setup';
import { post as marksAndWeightage } from '@/content/posts/marks-and-weightage';
import { post as markSheetFormat } from '@/content/posts/mark-sheet-format';
import { post as printingAClassSet } from '@/content/posts/printing-a-class-set';
import { post as proofreadingAQuestionPaper } from '@/content/posts/proofreading-a-question-paper';
import { post as questionNumbering } from '@/content/posts/question-numbering';
import { post as questionPaperFormat } from '@/content/posts/question-paper-format';
import { post as reusingPapers } from '@/content/posts/reusing-papers';
import { post as schoolNoticeFormat } from '@/content/posts/school-notice-format';
import { post as sectionsInQuestionPapers } from '@/content/posts/sections-in-question-papers';
import { post as worksheetLayout } from '@/content/posts/worksheet-layout';

/**
 * Every article, listed explicitly rather than discovered from the file system.
 * The site is a static export, so the set has to be known at build time, and an
 * explicit list means a post that fails to compile fails the build rather than
 * quietly disappearing from the index.
 */
const ALL: Post[] = [
  answerSpace,
  assignmentBriefFormat,
  certificateLayout,
  docxFormattingLoss,
  fontsForQuestionPapers,
  generalInstructions,
  marginsAndPageSetup,
  marksAndWeightage,
  markSheetFormat,
  printingAClassSet,
  proofreadingAQuestionPaper,
  questionNumbering,
  questionPaperFormat,
  reusingPapers,
  schoolNoticeFormat,
  sectionsInQuestionPapers,
  worksheetLayout,
];

const byNewest = (a: Post, b: Post) => (a.published < b.published ? 1 : -1);

export const allPosts = (): Post[] => [...ALL].sort(byNewest);

export const postSlugs = (): string[] => ALL.map((post) => post.slug);

export const postBySlug = (slug: string): Post | undefined =>
  ALL.find((post) => post.slug === slug);

export const postsByTopic = (topic: Topic): Post[] =>
  allPosts().filter((post) => post.topic === topic);

/**
 * Three further posts to offer at the end of an article: same topic first,
 * then whatever is newest, so a short topic still fills the row.
 */
export function relatedPosts(post: Post, count = 3): Post[] {
  const others = allPosts().filter((candidate) => candidate.slug !== post.slug);
  const sameTopic = others.filter((candidate) => candidate.topic === post.topic);
  const rest = others.filter((candidate) => candidate.topic !== post.topic);
  return [...sameTopic, ...rest].slice(0, count);
}
