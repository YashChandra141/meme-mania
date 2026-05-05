"use client";

import { Pencil, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type TextLayer = {
  id: string;
  text: string;
  x: number;
  y: number;
  size: number;
  color: string;
  bold: boolean;
  italic: boolean;
  fontFamily: string;
};

type Meme = {
  id: string;
  title: string;
  imageUrl: string;
  caption: string;
  author: string;
  textLayers?: TextLayer[];
};

const starterMemes: Meme[] = [
  {
    id: "local-1",
    title: "Monday Motivation",
    imageUrl: "https://i.imgflip.com/1bij.jpg",
    caption: "When coffee finally hits before the standup.",
    author: "Admin",
  },
  {
    id: "local-2",
    title: "Bugs vs Me",
    imageUrl: "https://i.imgflip.com/26am.jpg",
    caption: "Fixed one bug, created three features.",
    author: "DevShark",
  },
  {
    id: "local-3",
    title: "Weekend Deploy",
    imageUrl: "https://i.imgflip.com/30b1gx.jpg",
    caption: "Push to prod on Friday? Absolutely not.",
    author: "MemeNinja",
  },
];

type MemeForm = Omit<Meme, "id">;

const emptyForm: MemeForm = {
  title: "",
  imageUrl: "",
  caption: "",
  author: "",
};

const INITIAL_LAYER: TextLayer = {
  id: "layer-initial",
  text: "Your text",
  x: 50,
  y: 20,
  size: 28,
  color: "#ffffff",
  bold: true,
  italic: false,
  fontFamily: "Impact, Arial Black, sans-serif",
};

const defaultLayer = (): TextLayer => ({
  ...INITIAL_LAYER,
  id: `layer-${Date.now()}`,
});

export default function Home() {
  const [memes, setMemes] = useState<Meme[]>(starterMemes);
  const [formData, setFormData] = useState<MemeForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [remoteResults, setRemoteResults] = useState<Meme[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [textLayers, setTextLayers] = useState<TextLayer[]>([INITIAL_LAYER]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(INITIAL_LAYER.id);

  useEffect(() => {
    const loadGlobalMemes = async () => {
      try {
        const response = await fetch("https://api.imgflip.com/get_memes");
        const data: {
          success: boolean;
          data?: {
            memes: Array<{
              id: string;
              name: string;
              url: string;
            }>;
          };
        } = await response.json();

        if (!data.success || !data.data?.memes?.length) {
          return;
        }

        const fetchedMemes: Meme[] = data.data.memes.slice(0, 18).map((meme) => ({
          id: `imgflip-${meme.id}`,
          title: meme.name,
          imageUrl: meme.url,
          caption: "Global meme template from Imgflip.",
          author: "Imgflip",
        }));

        setMemes((prev) => {
          const userCreated = prev.filter((meme) => meme.author !== "Imgflip");
          return [...userCreated, ...fetchedMemes];
        });
      } catch {
        // Keep local starter memes if API is unavailable.
      }
    };

    void loadGlobalMemes();
  }, []);

  const isEditing = useMemo(() => editingId !== null, [editingId]);
  const activeLayer = useMemo(
    () => textLayers.find((layer) => layer.id === activeLayerId) ?? null,
    [textLayers, activeLayerId],
  );
  const filteredMemes = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return memes;
    }

    if (remoteResults.length) {
      return remoteResults;
    }

    return memes.filter((meme) => {
      const haystack = `${meme.title} ${meme.caption} ${meme.author}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [memes, searchTerm, remoteResults]);

  useEffect(() => {
    const query = searchTerm.trim();
    if (!query) {
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setIsSearching(true);
        const response = await fetch(
          `/api/memes/search?q=${encodeURIComponent(query)}`,
          {
            cache: "no-store",
          },
        );
        const data: { memes?: Meme[] } = await response.json();
        setRemoteResults(data.memes ?? []);
      } catch {
        setRemoteResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleChange =
    (field: keyof MemeForm) =>
    (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ): void => {
      setFormData((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingId(null);
    const layer = defaultLayer();
    setTextLayers([layer]);
    setActiveLayerId(layer.id);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (
      !formData.title.trim() ||
      !formData.imageUrl.trim() ||
      !formData.caption.trim() ||
      !formData.author.trim()
    ) {
      return;
    }

    if (isEditing && editingId !== null) {
      setMemes((prev) =>
        prev.map((meme) =>
          meme.id === editingId ? { ...meme, ...formData, textLayers } : meme,
        ),
      );
      resetForm();
      return;
    }

    const newMeme: Meme = {
      id: `local-${Date.now()}`,
      ...formData,
      textLayers,
    };
    setMemes((prev) => [newMeme, ...prev]);
    resetForm();
  };

  const handleEdit = (meme: Meme) => {
    setEditingId(meme.id);
    setFormData({
      title: meme.title,
      imageUrl: meme.imageUrl,
      caption: meme.caption,
      author: meme.author,
    });
    const existingLayers = meme.textLayers?.length ? meme.textLayers : [defaultLayer()];
    setTextLayers(existingLayers);
    setActiveLayerId(existingLayers[0]?.id ?? null);
  };

  const addTextLayer = () => {
    const layer = defaultLayer();
    setTextLayers((prev) => [...prev, layer]);
    setActiveLayerId(layer.id);
  };

  const updateActiveLayer = (updates: Partial<TextLayer>) => {
    if (!activeLayerId) return;
    setTextLayers((prev) =>
      prev.map((layer) =>
        layer.id === activeLayerId ? { ...layer, ...updates } : layer,
      ),
    );
  };

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-100">
      <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[340px_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-zinc-100">Meme Mania</CardTitle>
            <CardDescription>
              Share your meme and edit it anytime.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-sm text-zinc-300">Title</label>
                <Input
                  placeholder="Meme title"
                  value={formData.title}
                  onChange={handleChange("title")}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-zinc-300">Image URL</label>
                <Input
                  placeholder="https://example.com/meme.jpg"
                  value={formData.imageUrl}
                  onChange={handleChange("imageUrl")}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-zinc-300">Caption</label>
                <Textarea
                  placeholder="Write a funny caption..."
                  value={formData.caption}
                  onChange={handleChange("caption")}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-zinc-300">Your Name</label>
                <Input
                  placeholder="Who posted this?"
                  value={formData.author}
                  onChange={handleChange("author")}
                />
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" type="submit">
                  {isEditing ? (
                    <>
                      <Pencil className="mr-2 size-4" />
                      Update Meme
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 size-4" />
                      Post Meme
                    </>
                  )}
                </Button>
                {isEditing ? (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                ) : null}
              </div>
            </form>

            <div className="mt-6 space-y-4 border-t border-zinc-800 pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-zinc-200">Meme Text Editor</p>
                <Button type="button" variant="outline" onClick={addTextLayer}>
                  Add Text
                </Button>
              </div>

              <div className="relative aspect-video overflow-hidden rounded-md border border-zinc-700 bg-zinc-950">
                {formData.imageUrl.trim() ? (
                  <>
                    <img
                      src={formData.imageUrl}
                      alt="Meme editor preview"
                      className="h-full w-full object-cover"
                    />
                    {textLayers.map((layer) => (
                      <span
                        key={layer.id}
                        className="pointer-events-none absolute max-w-[85%] break-words text-center leading-tight [text-shadow:2px_2px_0_#000,-2px_2px_0_#000,2px_-2px_0_#000,-2px_-2px_0_#000]"
                        style={{
                          left: `${layer.x}%`,
                          top: `${layer.y}%`,
                          transform: "translate(-50%, -50%)",
                          fontSize: `${layer.size}px`,
                          color: layer.color,
                          fontWeight: layer.bold ? 800 : 500,
                          fontStyle: layer.italic ? "italic" : "normal",
                          fontFamily: layer.fontFamily,
                        }}
                      >
                        {layer.text}
                      </span>
                    ))}
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                    Add an image URL to start text editing.
                  </div>
                )}
              </div>

              <div className="grid gap-2">
                {textLayers.map((layer, index) => (
                  <button
                    key={layer.id}
                    type="button"
                    className={`rounded-md border px-3 py-2 text-left text-sm ${
                      activeLayerId === layer.id
                        ? "border-zinc-300 bg-zinc-800 text-zinc-100"
                        : "border-zinc-700 bg-zinc-900 text-zinc-400"
                    }`}
                    onClick={() => setActiveLayerId(layer.id)}
                  >
                    Layer {index + 1}: {layer.text || "Empty text"}
                  </button>
                ))}
              </div>

              {activeLayer ? (
                <div className="space-y-3 rounded-md border border-zinc-800 p-3">
                  <Input
                    value={activeLayer.text}
                    onChange={(event) => updateActiveLayer({ text: event.target.value })}
                    placeholder="Text content"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-xs text-zinc-400">
                      X Position
                      <Input
                        type="range"
                        min="5"
                        max="95"
                        value={activeLayer.x}
                        onChange={(event) =>
                          updateActiveLayer({ x: Number(event.target.value) })
                        }
                        className="mt-1 h-8 bg-transparent px-0"
                      />
                    </label>
                    <label className="text-xs text-zinc-400">
                      Y Position
                      <Input
                        type="range"
                        min="5"
                        max="95"
                        value={activeLayer.y}
                        onChange={(event) =>
                          updateActiveLayer({ y: Number(event.target.value) })
                        }
                        className="mt-1 h-8 bg-transparent px-0"
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-xs text-zinc-400">
                      Font Size
                      <Input
                        type="number"
                        min="12"
                        max="72"
                        value={activeLayer.size}
                        onChange={(event) =>
                          updateActiveLayer({ size: Number(event.target.value) || 28 })
                        }
                        className="mt-1"
                      />
                    </label>
                    <label className="text-xs text-zinc-400">
                      Color
                      <Input
                        type="color"
                        value={activeLayer.color}
                        onChange={(event) => updateActiveLayer({ color: event.target.value })}
                        className="mt-1 h-10 p-1"
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant={activeLayer.bold ? "default" : "outline"}
                      onClick={() => updateActiveLayer({ bold: !activeLayer.bold })}
                    >
                      Bold
                    </Button>
                    <Button
                      type="button"
                      variant={activeLayer.italic ? "default" : "outline"}
                      onClick={() => updateActiveLayer({ italic: !activeLayer.italic })}
                    >
                      Italic
                    </Button>
                  </div>
                  <label className="text-xs text-zinc-400">
                    Font Style
                    <select
                      className="mt-1 h-10 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100"
                      value={activeLayer.fontFamily}
                      onChange={(event) =>
                        updateActiveLayer({ fontFamily: event.target.value })
                      }
                    >
                      <option value="Impact, Arial Black, sans-serif">Impact</option>
                      <option value="Arial, sans-serif">Arial</option>
                      <option value="Georgia, serif">Georgia</option>
                      <option value="'Courier New', monospace">Courier New</option>
                    </select>
                  </label>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <section className="space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h1 className="text-3xl font-bold tracking-tight text-zinc-100">
                Trending Memes
              </h1>
              <p className="text-sm text-zinc-400">{memes.length} memes posted</p>
            </div>
            <Input
              placeholder="Search global memes..."
              value={searchTerm}
              onChange={(event) => {
                const value = event.target.value;
                setSearchTerm(value);
                if (!value.trim()) {
                  setRemoteResults([]);
                  setIsSearching(false);
                }
              }}
            />
            {isSearching ? (
              <p className="text-xs text-zinc-500">Searching global meme sources...</p>
            ) : null}
          </div>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filteredMemes.map((meme) => (
              <Card key={meme.id} className="overflow-hidden">
                <div className="relative aspect-video bg-zinc-800">
                  <img
                    src={meme.imageUrl}
                    alt={meme.title}
                    className="h-full w-full object-cover"
                  />
                  {(meme.textLayers ?? []).map((layer) => (
                    <span
                      key={layer.id}
                      className="pointer-events-none absolute max-w-[85%] break-words text-center leading-tight [text-shadow:2px_2px_0_#000,-2px_2px_0_#000,2px_-2px_0_#000,-2px_-2px_0_#000]"
                      style={{
                        left: `${layer.x}%`,
                        top: `${layer.y}%`,
                        transform: "translate(-50%, -50%)",
                        fontSize: `${layer.size}px`,
                        color: layer.color,
                        fontWeight: layer.bold ? 800 : 500,
                        fontStyle: layer.italic ? "italic" : "normal",
                        fontFamily: layer.fontFamily,
                      }}
                    >
                      {layer.text}
                    </span>
                  ))}
                </div>
                <CardContent className="space-y-3 p-4">
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-100">
                      {meme.title}
                    </h2>
                    <p className="mt-1 text-sm text-zinc-400">{meme.caption}</p>
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>Posted by {meme.author}</span>
                    <Button
                      variant="ghost"
                      className="h-8 px-3 text-xs"
                      onClick={() => handleEdit(meme)}
                    >
                      <Pencil className="mr-1 size-3.5" />
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {!filteredMemes.length ? (
            <p className="text-sm text-zinc-400">
              No memes found for &quot;{searchTerm}&quot;.
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
