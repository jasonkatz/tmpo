export interface GithubServiceDeps {
  fetch: typeof fetch;
}

export interface CreatePrParams {
  token: string;
  repo: string;
  head: string;
  title: string;
  body: string;
}

export interface CreatePrResult {
  number: number;
  url: string;
}

const defaultDeps: GithubServiceDeps = {
  fetch: globalThis.fetch,
};

export interface PostPrCommentParams {
  token: string;
  repo: string;
  prNumber: number;
  body: string;
}

export function createGithubService(deps: GithubServiceDeps = defaultDeps) {
  const headers = (token: string) => ({
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  });

  return {
    async postPrComment(params: PostPrCommentParams): Promise<void> {
      const { token, repo, prNumber, body } = params;
      const res = await deps.fetch(
        `https://api.github.com/repos/${repo}/issues/${prNumber}/comments`,
        {
          method: "POST",
          headers: headers(token),
          body: JSON.stringify({ body }),
        }
      );
      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(
          `GitHub API error posting PR comment (${res.status}): ${errBody}`
        );
      }
    },

    async createPullRequest(params: CreatePrParams): Promise<CreatePrResult> {
      const { token, repo, head, title, body } = params;

      // Fetch the default branch
      const repoRes = await deps.fetch(
        `https://api.github.com/repos/${repo}`,
        {
          method: "GET",
          headers: headers(token),
        }
      );

      if (!repoRes.ok) {
        const errBody = await repoRes.text();
        throw new Error(
          `GitHub API error fetching repo info (${repoRes.status}): ${errBody}`
        );
      }

      const repoData = (await repoRes.json()) as { default_branch: string };
      const base = repoData.default_branch;

      // Create the pull request
      const res = await deps.fetch(
        `https://api.github.com/repos/${repo}/pulls`,
        {
          method: "POST",
          headers: headers(token),
          body: JSON.stringify({
            title,
            body,
            head,
            base,
          }),
        }
      );

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(
          `GitHub API error creating PR (${res.status}): ${errBody}`
        );
      }

      const data = (await res.json()) as { number: number; html_url: string };

      return {
        number: data.number,
        url: data.html_url,
      };
    },
  };
}

export const githubService = createGithubService();
