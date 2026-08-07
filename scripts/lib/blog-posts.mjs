/**
 * Robust inläsning av src/lib/blog-data.ts.
 *
 * Den tidigare parsern krävde att fälten stod i exakt ordningen
 * slug, title, seoTitle, metaDescription, publishDate, readTime, excerpt.
 * Lade någon till ett fält eller bytte ordning försvann inlägget tyst ur
 * prerenderingen och sitemapen — utan felmeddelande.
 *
 * Den här varianten delar upp arrayen i objektblock och plockar varje fält
 * på namn. Ordningen spelar ingen roll, och saknade fält ger ett tydligt fel
 * i stället för att inlägget bara försvinner.
 */

import { readFileSync } from "node:fs";

const REQUIRED_FIELDS = [
  "slug",
  "title",
  "seoTitle",
  "metaDescription",
  "publishDate",
  "readTime",
  "excerpt",
];

/** Plockar ut innehållet i `export const blogPosts: BlogPost[] = [ ... ];` */
function extractArrayBody(src) {
  const start = src.indexOf("blogPosts");
  if (start === -1) {
    throw new Error("Hittade ingen `blogPosts`-deklaration i blog-data.ts");
  }
  // Hoppa förbi typannoteringen (`: BlogPost[]`) och leta arraystarten efter `=`.
  const assign = src.indexOf("=", start);
  const open = assign === -1 ? -1 : src.indexOf("[", assign);
  if (open === -1) {
    throw new Error("Hittade ingen array-start efter `blogPosts`");
  }

  let depth = 0;
  let inString = null;
  for (let i = open; i < src.length; i += 1) {
    const ch = src[i];
    const prev = src[i - 1];

    if (inString) {
      if (ch === inString && prev !== "\\") inString = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      inString = ch;
      continue;
    }
    if (ch === "[") depth += 1;
    else if (ch === "]") {
      depth -= 1;
      if (depth === 0) return src.slice(open + 1, i);
    }
  }
  throw new Error("Kunde inte hitta slutet på blogPosts-arrayen");
}

/** Delar arraykroppen i toppnivåobjekt, med hänsyn till nästlade [] och {}. */
function splitObjects(body) {
  const blocks = [];
  let depth = 0;
  let startIndex = -1;
  let inString = null;

  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    const prev = body[i - 1];

    if (inString) {
      if (ch === inString && prev !== "\\") inString = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      inString = ch;
      continue;
    }
    if (ch === "{") {
      if (depth === 0) startIndex = i;
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0 && startIndex !== -1) {
        blocks.push(body.slice(startIndex + 1, i));
        startIndex = -1;
      }
    }
  }
  return blocks;
}

/** Läser ett strängfält på namn, oavsett var i objektet det står. */
function readField(block, field) {
  const re = new RegExp(
    `(?:^|[,{\\s])${field}\\s*:\\s*(['"\`])((?:\\\\.|(?!\\1).)*)\\1`,
    "s"
  );
  const match = block.match(re);
  if (!match) return null;
  return match[2]
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\`/g, "`")
    .replace(/\\\\/g, "\\");
}

export function loadBlogPosts(blogDataPath) {
  const src = readFileSync(blogDataPath, "utf8");
  const blocks = splitObjects(extractArrayBody(src));

  const posts = blocks.map((block, index) => {
    const post = {};
    for (const field of REQUIRED_FIELDS) {
      const value = readField(block, field);
      if (value === null) {
        const hint = readField(block, "slug") ?? `objekt #${index + 1}`;
        throw new Error(
          `Blogginlägget "${hint}" saknar fältet "${field}" i blog-data.ts`
        );
      }
      post[field] = value;
    }
    return post;
  });

  if (posts.length === 0) {
    throw new Error("Kunde inte parsa några blogginlägg ur blog-data.ts");
  }

  const slugs = new Set();
  for (const post of posts) {
    if (slugs.has(post.slug)) {
      throw new Error(`Dubblerad blogg-slug i blog-data.ts: "${post.slug}"`);
    }
    slugs.add(post.slug);
  }

  return posts;
}
