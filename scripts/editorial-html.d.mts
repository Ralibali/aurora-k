export function renderEditorialArticle(article: {
 title: string; publishDate?: string; publishedDate?: string; intro: string;
 sections: { heading: string; content: string }[];
 links?: { href: string; label: string }[]; ctaHref?: string; ctaLabel?: string;
}): string;
