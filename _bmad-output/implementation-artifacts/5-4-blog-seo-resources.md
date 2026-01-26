# Story 5.4: Blog & SEO Resources

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a marketing lead,
I want a blog section to publish articles about "WhatsApp API for Business",
So that we attract organic search traffic (SEO).

## Acceptance Criteria

**Given** the Next.js public site
**When** I access `/blog`
**Then** I should see a list of articles fetched from markdown files
**And** each article should have proper meta tags (Title, Description, OG Image)

## Tasks / Subtasks

- [ ] Task 1: Create Blog Infrastructure (AC: MDX/Markdown support)
  - [ ] Install `@next/mdx` or `contentlayer` for markdown parsing
  - [ ] Create `content/blog/` folder for articles
  - [ ] Configure Next.js for static generation of blog posts

- [ ] Task 2: Create Blog List Page (AC: Articles listed)
  - [ ] Create `/blog` route with articles grid
  - [ ] Display title, excerpt, date, reading time
  - [ ] Add pagination (if needed)

- [ ] Task 3: Create Blog Post Page (AC: Individual article readable)
  - [ ] Create `/blog/[slug]` dynamic route
  - [ ] Render markdown content with syntax highlighting
  - [ ] Add author info, date, share buttons

- [ ] Task 4: Implement SEO Metadata (AC: Proper meta tags)
  - [ ] Generate `<title>` and `<meta description>` per article
  - [ ] Add Open Graph tags (og:title, og:description, og:image)
  - [ ] Add Twitter Card metadata
  - [ ] Generate sitemap.xml for blog posts

- [ ] Task 5: Create Seed Content (AC: Initial articles)
  - [ ] Article 1: "Getting Started with WhatsApp API"
  - [ ] Article 2: "How to Send WhatsApp Messages Programmatically"
  - [ ] Article 3: "WhatsApp API Pricing Comparison"

## Dev Notes

### Technical Requirements

**Recommended Stack:**
- **Contentlayer** or **@next/mdx** for MDX support
- **gray-matter** for frontmatter parsing
- **rehype-highlight** for code syntax highlighting

**Markdown Frontmatter Format:**
```md
---
title: "Getting Started with WhatsApp API"
description: "Learn how to connect WhatsApp to your app in 5 minutes"
date: "2026-01-15"
author: "Patrick"
image: "/blog/whatsapp-api-intro.png"
tags: ["whatsapp", "api", "tutorial"]
---

# Article content here...
```

### File Structure Requirements

```
apps/web/
├── content/
│   └── blog/
│       ├── getting-started-whatsapp-api.mdx
│       ├── send-messages-programmatically.mdx
│       └── whatsapp-api-pricing.mdx
├── src/app/
│   └── blog/
│       ├── page.tsx           # Blog list
│       └── [slug]/
│           └── page.tsx       # Individual post
└── src/lib/
    └── blog.ts                # Blog utilities (fetch, parse)
```

### SEO Implementation

**Dynamic Metadata (Next.js 14):**
```typescript
// app/blog/[slug]/page.tsx
export async function generateMetadata({ params }) {
  const post = await getPost(params.slug);
  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      images: [post.image],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
    },
  };
}
```

**Sitemap Generation:**
```typescript
// app/sitemap.ts
export default async function sitemap() {
  const posts = await getAllPosts();
  return posts.map((post) => ({
    url: `https://yoursite.com/blog/${post.slug}`,
    lastModified: post.date,
  }));
}
```

### Project Structure Notes

**Depends on Story 5.1:**
- Requires Next.js app initialized
- Uses same layout and design system

### References

**Epic Context:**
- [Story 5.4 Planning](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/Epics/Epic-05-Public-Site-and-Growth/Story-5.4-Blog-and-SEO-Resources.md)

**SEO Best Practices:**
- Static generation for fast page loads
- Proper heading hierarchy (h1, h2, h3)
- Internal linking between articles

## Dev Agent Record

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

_To be filled by dev agent_

### Completion Notes List

_To be filled by dev agent_

### File List

_To be filled by dev agent_
