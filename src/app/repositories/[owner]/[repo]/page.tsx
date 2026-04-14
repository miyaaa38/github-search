import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { RepositoryBackLink } from "@/components/features/repository/RepositoryBackLink"
import { RepositoryDetail } from "@/components/features/repository/RepositoryDetail"
import { getRepository, RepositoryNotFoundError } from "@/lib/api/github"

type PageProps = {
  params: Promise<{ owner: string; repo: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { owner, repo } = await params
  return {
    title: `${owner}/${repo} — GitHub Search`,
  }
}

export default async function RepositoryDetailPage({ params }: PageProps) {
  const { owner, repo } = await params

  let repoDetail
  try {
    repoDetail = await getRepository(owner, repo)
  } catch (error) {
    if (error instanceof RepositoryNotFoundError) {
      notFound()
    }
    throw error
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="mb-6">
        <RepositoryBackLink />
      </div>
      <RepositoryDetail repo={repoDetail} />
    </div>
  )
}
