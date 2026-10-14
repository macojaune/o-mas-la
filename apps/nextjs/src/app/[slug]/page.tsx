import fs from "fs"
import path from "path"
import { notFound } from "next/navigation"
import matter from "gray-matter"
import { marked } from "marked"

import { NavigationBar } from "../_components/map/navigation-bar"

interface PostProps {
  params: Promise<{
    slug: string
  }>
}

async function getPost(slug: string) {
  try {
    const markdownFile = fs.readFileSync(
      path.join(process.cwd(), "src", "content", `${slug}.md`),
      "utf-8",
    )
    const { data: frontmatter, content } = matter(markdownFile)
    const htmlContent = await marked(content)
    const metadata = {
      title:
        typeof frontmatter.title === "string" ? frontmatter.title : undefined,
      date: typeof frontmatter.date === "string" ? frontmatter.date : undefined,
      description:
        typeof frontmatter.description === "string"
          ? frontmatter.description
          : undefined,
    }

    return {
      frontmatter: metadata,
      htmlContent,
    }
  } catch {
    return null
  }
}

export function generateStaticParams() {
  const files = fs.readdirSync(path.join(process.cwd(), "src", "content"))
  const markdownFiles = files.filter((file) => file.endsWith(".md"))

  return markdownFiles.map((filename) => ({
    slug: filename.replace(".md", ""),
  }))
}

export default async function Post({ params }: PostProps) {
  const post = await getPost((await params).slug)

  if (!post) {
    notFound()
  }

  const { frontmatter, htmlContent } = post

  return (
    <div className="container px-4 py-8">
      <NavigationBar />

      {/* Render frontmatter if available */}
      {frontmatter.title && (
        <h1 className="mb-4 text-4xl font-bold">{frontmatter.title}</h1>
      )}
      {frontmatter.date && (
        <p className="mb-8 text-gray-600">{frontmatter.date}</p>
      )}

      {/* Render markdown content */}
      <article
        className="prose prose-xl"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  )
}

// Optional: Add metadata
export async function generateMetadata({ params }: PostProps) {
  const post = await getPost((await params).slug)

  if (!post) {
    return {
      title: "Post Not Found",
    }
  }

  return {
    title: post.frontmatter.title,
    description: post.frontmatter.description ?? "",
  }
}
