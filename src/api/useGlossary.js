import { useCallback, useEffect, useState } from "react";
import api from "../api"; // <-- adjust: your axios instance (baseURL + auth)

// Loaded once per page session and shared by every form that uses the hook.
let cache = null; // { words: string[] (lowercase, sorted), terms: {id, word}[] }
let loading = null;

function load() {
  if (cache) return Promise.resolve(cache);
  if (!loading) {
    loading = api
      .get("/glossary/terms")
      .then((res) => {
        const terms = [...res.data].sort((a, b) =>
          a.word.toLowerCase().localeCompare(b.word.toLowerCase())
        );
        cache = { terms, words: terms.map((t) => t.word.toLowerCase()) };
        return cache;
      })
      .catch((err) => {
        loading = null; // allow retry
        throw err;
      });
  }
  return loading;
}

// First index whose word is >= prefix (binary search on the sorted array).
function lowerBound(words, prefix) {
  let lo = 0;
  let hi = words.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (words[mid] < prefix) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export default function useGlossary() {
  const [ready, setReady] = useState(Boolean(cache));

  useEffect(() => {
    if (cache) return;
    let alive = true;
    load()
      .then(() => alive && setReady(true))
      .catch(() => {}); // suggestions are optional, typing must never break
    return () => {
      alive = false;
    };
  }, []);

  // Returns up to `limit` terms starting with `prefix`. No server call.
  const suggest = useCallback((prefix, limit = 8) => {
    if (!cache || !prefix) return [];
    const p = prefix.toLowerCase();
    const out = [];
    for (let i = lowerBound(cache.words, p); i < cache.words.length && out.length < limit; i++) {
      if (!cache.words[i].startsWith(p)) break;
      if (cache.words[i] !== p) out.push(cache.terms[i]); // hide exact match
    }
    return out;
  }, []);

  // Translations of one picked word, only for the languages asked.
  const getTranslations = useCallback(async (termId, languages = ["ta"]) => {
    const res = await api.get(`/glossary/terms/${termId}/translations`, {
      params: { languages: languages.join(",") },
    });
    return res.data; // { ta: "முக்கோணம்" }
  }, []);

  return { ready, suggest, getTranslations };
}
