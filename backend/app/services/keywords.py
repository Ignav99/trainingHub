"""
Síntesis de keywords desde texto de objetivo de sesión (ES).
"""

from __future__ import annotations

import re
import unicodedata
from typing import Iterable, List, Set

STOPWORDS_ES: Set[str] = {
    "a", "al", "algo", "algunas", "algunos", "ante", "antes", "como", "con", "contra",
    "cual", "cuando", "de", "del", "desde", "donde", "durante", "e", "el", "ella",
    "ellas", "ellos", "en", "entre", "era", "erais", "eran", "esas", "esos", "esta",
    "estas", "este", "estos", "fin", "fue", "fueron", "ha", "haber", "habia", "han",
    "has", "hasta", "hay", "la", "las", "le", "les", "lo", "los", "mas", "me", "mi",
    "mis", "muy", "ni", "no", "nos", "o", "os", "otra", "otras", "otro", "otros",
    "para", "pero", "poco", "por", "porque", "que", "se", "sea", "sean", "segun",
    "ser", "si", "sin", "sobre", "su", "sus", "tambien", "te", "tiene", "tienen",
    "todo", "todos", "tu", "tus", "un", "una", "unas", "uno", "unos", "y", "ya",
    "hacer", "mejorar", "trabajar", "trabajo", "sesion", "partido", "equipo",
    "nuestro", "nuestra", "nuestros", "nuestras", "hoy", "esta",
}

# Tokens tácticos que siempre se conservan aunque sean cortos
KEEP = {
    "abp", "1v1", "2v1", "3v2", "4v4", "ssg", "rondo", "pressing", "bloque",
    "salida", "progresion", "finalizacion", "transicion", "amplitud", "profundidad",
}


def _strip_accents(text: str) -> str:
    nfkd = unicodedata.normalize("NFKD", text)
    return "".join(c for c in nfkd if not unicodedata.combining(c))


def synthesize_keywords(
    objetivo: str | None,
    extra: Iterable[str] | None = None,
    *,
    max_keywords: int = 24,
) -> List[str]:
    """Genera keywords filtrables a partir del objetivo (+ extras manuales)."""
    tokens: List[str] = []
    if objetivo:
        cleaned = _strip_accents(objetivo.lower())
        cleaned = re.sub(r"[^\w\s\-+/]", " ", cleaned, flags=re.UNICODE)
        for raw in re.split(r"[\s,/|;]+", cleaned):
            t = raw.strip("-_")
            if not t:
                continue
            if t in KEEP or (len(t) >= 3 and t not in STOPWORDS_ES):
                tokens.append(t)

    if extra:
        for e in extra:
            if not e:
                continue
            t = _strip_accents(str(e).lower().strip())
            t = re.sub(r"[^\w\-+/]", "", t)
            if t and (t in KEEP or (len(t) >= 2 and t not in STOPWORDS_ES)):
                tokens.append(t)

    # Dedup preservando orden
    seen: Set[str] = set()
    out: List[str] = []
    for t in tokens:
        if t not in seen:
            seen.add(t)
            out.append(t)
        if len(out) >= max_keywords:
            break
    return out
