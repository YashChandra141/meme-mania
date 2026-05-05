import { NextResponse } from "next/server";

type SearchMeme = {
  id: string;
  title: string;
  imageUrl: string;
  caption: string;
  author: string;
};

type ImgflipResponse = {
  success: boolean;
  data?: {
    memes: Array<{
      id: string;
      name: string;
      url: string;
    }>;
  };
};

type RedditResponse = {
  data?: {
    children: Array<{
      data: {
        id: string;
        title: string;
        subreddit_name_prefixed: string;
        url_overridden_by_dest?: string;
        preview?: {
          images?: Array<{
            source?: {
              url?: string;
            };
          }>;
        };
      };
    }>;
  };
};

type MemeApiResponse = {
  postLink?: string;
  subreddit?: string;
  title?: string;
  url?: string;
  nsfw?: boolean;
  spoiler?: boolean;
  memes?: Array<{
    postLink: string;
    subreddit: string;
    title: string;
    url: string;
    nsfw: boolean;
    spoiler: boolean;
  }>;
};

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
const INDIAN_SUBREDDITS = [
  "IndianDankMemes",
  "desimemes",
  "IndianMeyMeys",
  "SaimanSays",
  "DankinIndia",
  "IndianTeenagers",
];
const SOFTWARE_SUBREDDITS = [
  "ProgrammerHumor",
  "softwaregore",
  "codingmemes",
  "ProgrammerDadJokes",
];
const SPECIAL_TERMS = ["india", "indian", "desi", "software", "coding", "programming"];

function isImageUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.includes(ext));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim().toLowerCase() ?? "";

  if (!query) {
    return NextResponse.json({ memes: [] satisfies SearchMeme[] });
  }

  const results: SearchMeme[] = [];
  const seen = new Set<string>();
  const shouldBypassTitleFilter = SPECIAL_TERMS.some((term) => query.includes(term));

  try {
    const imgflipResponse = await fetch("https://api.imgflip.com/get_memes", {
      next: { revalidate: 900 },
    });
    const imgflipData: ImgflipResponse = await imgflipResponse.json();

    if (imgflipData.success && imgflipData.data?.memes?.length) {
      for (const meme of imgflipData.data.memes) {
        if (!meme.name.toLowerCase().includes(query)) {
          continue;
        }
        const id = `imgflip-${meme.id}`;
        if (seen.has(id)) {
          continue;
        }
        seen.add(id);
        results.push({
          id,
          title: meme.name,
          imageUrl: meme.url,
          caption: `Matched "${query}" in Imgflip templates.`,
          author: "Imgflip",
        });
      }
    }
  } catch {
    // Continue with any other sources.
  }

  try {
    const redditResponse = await fetch(
      `https://www.reddit.com/search.json?q=${encodeURIComponent(
        `${query} meme`,
      )}&sort=relevance&t=all&limit=30`,
      {
        headers: {
          "User-Agent": "MemeManiaSearch/1.0",
        },
        cache: "no-store",
      },
    );
    const redditData: RedditResponse = await redditResponse.json();
    const posts = redditData.data?.children ?? [];

    for (const post of posts) {
      const postData = post.data;
      const imageUrl =
        postData.url_overridden_by_dest ?? postData.preview?.images?.[0]?.source?.url;

      if (!imageUrl || !isImageUrl(imageUrl)) {
        continue;
      }

      const id = `reddit-${postData.id}`;
      if (seen.has(id)) {
        continue;
      }
      seen.add(id);
      results.push({
        id,
        title: postData.title,
        imageUrl: imageUrl.replaceAll("&amp;", "&"),
        caption: `Live result for "${query}".`,
        author: postData.subreddit_name_prefixed,
      });
    }
  } catch {
    // Ignore source failure and return partial results.
  }

  try {
    const randomPoolResponse = await fetch("https://meme-api.com/gimme/30", {
      cache: "no-store",
    });
    const randomPoolPayload: MemeApiResponse = await randomPoolResponse.json();
    const randomPoolMemes = randomPoolPayload.memes ?? [];

    for (const meme of randomPoolMemes) {
      const matchesQuery = meme.title.toLowerCase().includes(query);
      const matchesSpecial = shouldBypassTitleFilter;
      if (!matchesQuery && !matchesSpecial) {
        continue;
      }
      if (!meme.url || !isImageUrl(meme.url)) {
        continue;
      }

      const id = `random-${meme.postLink}`;
      if (seen.has(id)) {
        continue;
      }
      seen.add(id);
      results.push({
        id,
        title: meme.title,
        imageUrl: meme.url,
        caption: `Random meme-api match for "${query}".`,
        author: `r/${meme.subreddit}`,
      });
    }
  } catch {
    // Ignore random pool failures.
  }

  try {
    const subredditRequests = [...INDIAN_SUBREDDITS, ...SOFTWARE_SUBREDDITS].map(
      (subreddit) =>
      fetch(`https://meme-api.com/gimme/${subreddit}/15`, {
        cache: "no-store",
      }),
    );
    const subredditResponses = await Promise.allSettled(subredditRequests);

    for (const response of subredditResponses) {
      if (response.status !== "fulfilled") {
        continue;
      }
      const payload: MemeApiResponse = await response.value.json();
      const memes = payload.memes ?? [];

      for (const meme of memes) {
        if (!shouldBypassTitleFilter && !meme.title.toLowerCase().includes(query)) {
          continue;
        }
        if (!meme.url || !isImageUrl(meme.url)) {
          continue;
        }

        const id = `community-${meme.postLink}`;
        if (seen.has(id)) {
          continue;
        }
        seen.add(id);
        const isIndianSource = INDIAN_SUBREDDITS.includes(meme.subreddit);
        const sourceLabel = isIndianSource ? "Indian" : "Software";
        results.push({
          id,
          title: meme.title,
          imageUrl: meme.url,
          caption: `${sourceLabel} meme source match for "${query}".`,
          author: `r/${meme.subreddit}`,
        });
      }
    }
  } catch {
    // Keep existing results when Indian API source is unavailable.
  }

  return NextResponse.json({ memes: results.slice(0, 36) });
}
