import { Fragment, type ReactNode } from "react";
import { Link } from "wouter";

const TOKEN = /(#[\p{L}\p{N}_]{2,40}|@[A-Za-z0-9_.]{2,30}|\*\*[^*\n]+\*\*|\*[^*\n]+\*)/gu;

/**
 * Safe inline renderer: plain text only (no HTML). Converts #hashtags and @mentions
 * into navigation links and supports **bold** / *italic* when `inlineFormatting` is on.
 */
export function renderInline(text: string, inlineFormatting = false, keyPrefix = "t", textHref?: string): ReactNode[] {
  const parts = text.split(TOKEN);
  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (!part) return null;
    if (part.startsWith("#") && part.length > 2) {
      const tag = part.slice(1);
      return (
        <Link
          key={key}
          href={`/search?q=${encodeURIComponent("#" + tag.toLowerCase())}`}
          onClick={(event) => event.stopPropagation()}
          className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
        >
          {part}
        </Link>
      );
    }
    if (part.startsWith("@") && part.length > 2) {
      return (
        <Link
          key={key}
          href={`/profile/${encodeURIComponent(part.slice(1))}`}
          onClick={(event) => event.stopPropagation()}
          className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
        >
          {part}
        </Link>
      );
    }
    if (inlineFormatting && part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={key} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
    }
    if (inlineFormatting && part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }
    return textHref
      ? <Link key={key} href={textHref} className="text-inherit no-underline">{part}</Link>
      : <Fragment key={key}>{part}</Fragment>;
  });
}

export function RichText({ text, className = "", href }: { text: string; className?: string; href?: string }) {
  return <p className={`whitespace-pre-wrap break-words ${className}`}>{renderInline(text, false, "t", href)}</p>;
}

/**
 * Controlled article markdown subset: "## " headings, "- " lists, blank-line paragraphs,
 * **bold**, *italic*, hashtags and mentions. Never interprets HTML.
 */
export function ArticleBody({ body, className = "" }: { body: string; className?: string }) {
  const blocks = body.replace(/\r\n/g, "\n").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className={`space-y-5 text-[1.05rem] leading-[1.8] text-foreground/90 ${className}`}>
      {blocks.map((block, index) => {
        const lines = block.split("\n");
        if (lines.every((line) => /^\s*-\s+/.test(line))) {
          return (
            <ul key={index} className="list-disc space-y-1.5 pl-6 marker:text-primary">
              {lines.map((line, li) => (
                <li key={li}>{renderInline(line.replace(/^\s*-\s+/, ""), true, `b${index}-${li}`)}</li>
              ))}
            </ul>
          );
        }
        if (block.startsWith("## ")) {
          return (
            <h2 key={index} className="pt-2 text-xl font-bold tracking-tight text-foreground">
              {renderInline(block.slice(3), true, `h${index}`)}
            </h2>
          );
        }
        if (block.startsWith("> ")) {
          return (
            <blockquote key={index} className="border-l-2 border-primary pl-4 italic text-muted-foreground">
              {renderInline(block.replace(/^>\s?/gm, ""), true, `q${index}`)}
            </blockquote>
          );
        }
        return (
          <p key={index} className="whitespace-pre-wrap break-words">
            {renderInline(block, true, `p${index}`)}
          </p>
        );
      })}
    </div>
  );
}

export function articleExcerpt(body: string, max = 220): string {
  const plain = body.replace(/^##\s+/gm, "").replace(/^>\s?/gm, "").replace(/^\s*-\s+/gm, "").replace(/\*\*?([^*]+)\*\*?/g, "$1").replace(/\s+/g, " ").trim();
  return plain.length > max ? `${plain.slice(0, max).trimEnd()}…` : plain;
}

export function readingMinutes(body: string): number {
  return Math.max(1, Math.round(body.split(/\s+/).filter(Boolean).length / 200));
}
