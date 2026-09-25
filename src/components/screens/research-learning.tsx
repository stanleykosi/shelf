"use client";

import Link from "next/link";
import { useState } from "react";
import { articles } from "@/data/catalog";
import { ResearchJourney, JourneyHeading } from "@/components/research-journey";
import { ArrowUpRight, ShieldCheck } from "@/components/studio-icons";
import {
  CtaLink,
  EmptyState,
  Field,
} from "@/components/ui";

const topics = [
  { name: "Products & relationships", slugs: ["brands-and-companies"] },
  {
    name: "Understanding exposure",
    slugs: ["stock-tokens", "pre-ipo-exposure", "price-differences"],
  },
  {
    name: "Wallet & transactions",
    slugs: ["usdc-and-solana", "fees", "splits-and-dividends"],
  },
];

export function LearnScreen({ slug }: { slug?: string }) {
  const [query, setQuery] = useState("");
  if (slug) {
    const article = articles.find((item) => item.slug === slug);
    if (!article)
      return (
        <EmptyState
          title="Explainer unavailable"
          action={
            <CtaLink id="learn-return" href="/learn">
              Learning library
            </CtaLink>
          }
        >
          Choose another reviewed topic from the library.
        </EmptyState>
      );
    return (
      <ResearchJourney kind="article" backHref="/learn" backLabel="Learning library">
        <JourneyHeading
          eyebrow={`Reviewed ${article.reviewedAt} · Version ${article.version}`}
          title={article.title}
        />
        <div className="learning-article-layout"><aside className="learning-margin-note"><ShieldCheck size={23} aria-hidden="true" /><p className="studio-eyebrow">Research notes</p><p>Build understanding, one connection at a time.</p><span>Reviewed {article.reviewedAt}</span></aside><article className="research-section learning-article-body" aria-label={article.title}>
          {article.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <p className="muted">
            Shelf educational guidance. This is not a recommendation to buy or
            sell an instrument.
          </p>
        </article></div>
        <section className="research-section">
          <h2>Continue your research</h2>
          <div className="actions">
            <CtaLink id="learn-discover" href="/discover" secondary>
              Explore products and companies
            </CtaLink>
          </div>
        </section>
      </ResearchJourney>
    );
  }
  const matching = articles.filter((article) =>
    `${article.title} ${article.body.join(" ")}`
      .toLowerCase()
      .includes(query.toLowerCase().trim())
  );
  return (
    <ResearchJourney kind="library">
      <JourneyHeading eyebrow="Learning library" title="Understand each layer.">
        <p>
          Products, companies, exposure and ownership. Reviewed explainers for
          the decisions in between.
        </p>
      </JourneyHeading>
      <Field label="Find a topic" htmlFor="learn-search">
        <input
          id="learn-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Relationships, fees, pricing…"
        />
      </Field>
      {topics.map((topic) => {
        const entries = matching.filter((article) =>
          topic.slugs.includes(article.slug)
        );
        return entries.length ? (
          <section className="research-section" key={topic.name}>
            <h2>{topic.name}</h2>
            <div className="research-rows">
              {entries.map((article) => (
                <article className="research-row" key={article.slug}>
                  <div>
                    <h3>
                      <Link href={`/learn/${article.slug}`}>
                        {article.title}
                      </Link>
                    </h3>
                    <p className="muted">
                      Reviewed {article.reviewedAt} · Version {article.version}
                    </p>
                  </div>
                  <Link
                    className="button ghost"
                    href={`/learn/${article.slug}`}
                    aria-label={`Read ${article.title}`}
                  >
                    Read <ArrowUpRight size={16} aria-hidden="true" />
                  </Link>
                </article>
              ))}
            </div>
          </section>
        ) : null;
      })}
      {!matching.length ? (
        <EmptyState title="No matching topics">
          Try a broader term, such as fees or companies.
        </EmptyState>
      ) : null}
    </ResearchJourney>
  );
}
