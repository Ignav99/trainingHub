"""
Extracción de keywords / keyphrases para objetivos de sesión (ES).

Enfoque híbrido (inspirado en RAKE + léxico de dominio):
1. Empareja primero frases tácticas multi-palabra (longest-match).
2. Sobre el resto, RAKE-like: candidatos = secuencias entre stopwords.
3. Filtra ruido (tokens cortos / adjetivos sueltos) y deduplica.
4. Extras manuales se conservan como frase (no se pegan ni se parten).

Sin dependencias NLP pesadas (spacy/nltk); apto para objetivos cortos de entrenamiento.
"""

from __future__ import annotations

import re
import unicodedata
from typing import Iterable, List, Optional, Sequence, Set, Tuple

# ---------------------------------------------------------------------------
# Stopwords ES amplias (incl. verbos genéricos de redacción de objetivos)
# ---------------------------------------------------------------------------
STOPWORDS_ES: Set[str] = {
    "a", "al", "algo", "algunas", "algunos", "ante", "antes", "aqui", "asi",
    "como", "con", "contra", "cual", "cuando", "de", "del", "desde", "donde",
    "durante", "e", "el", "ella", "ellas", "ellos", "en", "entre", "era",
    "erais", "eran", "esas", "esos", "esta", "estas", "este", "estos", "fin",
    "fue", "fueron", "ha", "haber", "habia", "han", "has", "hasta", "hay",
    "la", "las", "le", "les", "lo", "los", "mas", "me", "mi", "mis", "muy",
    "ni", "no", "nos", "o", "os", "otra", "otras", "otro", "otros", "para",
    "pero", "poco", "por", "porque", "que", "se", "sea", "sean", "segun",
    "ser", "si", "sin", "sobre", "su", "sus", "tambien", "te", "tiene",
    "tienen", "todo", "todos", "tu", "tus", "un", "una", "unas", "uno",
    "unos", "y", "ya", "tras", "mediante", "hacia", "bajo", "cada", "cualquiera",
    # redacción de objetivos / sesión
    "hacer", "mejorar", "trabajar", "trabajo", "sesion", "partido", "equipo",
    "nuestro", "nuestra", "nuestros", "nuestras", "hoy", "dia", "nueva",
    "nuevo", "conseguir", "lograr", "buscar", "mantener", "potenciar",
    "desarrollar", "enfocar", "enfoque", "objetivo", "objetivos", "principal",
    "queremos", "vamos", "seguir", "incidir", "incidiendo", "aspecto",
    "aspectos", "tema", "temas", "parte", "nivel", "forma", "manera",
    "ultimo", "ultima", "primer", "primera", "segundo", "tercero",
}

# Tokens tácticos / formatos que se conservan aunque sean cortos
KEEP_SINGLE: Set[str] = {
    "abp", "ssg", "rondo", "pressing", "gegenpressing", "bloqueo", "bloque",
    "amplitud", "profundidad", "posesion", "transicion", "finalizacion",
    "progresion", "salida", "remate", "centro", "regate", "marcaje", "acoso",
    "cobertura", "permuta", "basculacion", "repliegue", "achique",
    "desmarque", "pared", "conduccion", "anticipacion", "temporizacion",
    "vigilancias", "superioridad", "inferioridad", "conservacion", "circulacion",
    "1v1", "2v1", "2v2", "3v2", "3v3", "4v3", "4v4", "5v5", "6v6", "7v7",
    "8v8", "9v9", "11v11", "gk", "por",
}

# Adjetivos / palabras que NO valen solas (sí dentro de frase)
WEAK_SINGLE: Set[str] = {
    "alta", "alto", "baja", "bajo", "media", "medio", "media", "larga", "corto",
    "corta", "rapida", "rapido", "lenta", "lento", "buena", "bueno", "mejor",
    "peor", "grande", "pequena", "fuerte", "debil", "organizada", "organizado",
    "colectiva", "colectivo", "individual", "tactica", "tactico", "tecnica",
    "tecnico", "fisica", "fisico", "mental", "general", "especifica",
}

# ---------------------------------------------------------------------------
# Léxico de frases tácticas (canonical sin acentos, palabras separadas)
# Orden: se ordenan por longitud (nº tokens) desc en runtime.
# ---------------------------------------------------------------------------
_PHRASE_LEXICON: Tuple[str, ...] = (
    # presión / bloques
    "presion alta",
    "presion media",
    "presion baja",
    "presion alta tras perdida",
    "presion tras perdida",
    "presion tras recuperacion",
    "presion saque de meta",
    "contra presion",
    "contrapresion",
    "bloque alto",
    "bloque medio",
    "bloque bajo",
    "repliegue organizado",
    "repliegue intensivo",
    # ataque / posesión
    "salida de balon",
    "salida balon",
    "juego entre lineas",
    "juego de posicion",
    "juego posicional",
    "juego por banda",
    "juego interior",
    "juego exterior",
    "ocupacion de espacios",
    "ataque de espacios",
    "ataque organizado",
    "defensa organizada",
    "conservacion del balon",
    "conservacion de balon",
    "pase y circulacion",
    "cambio de orientacion",
    "tercer hombre",
    "hombre libre",
    "control orientado",
    "cobertura de balon",
    "superioridad numerica",
    "inferioridad numerica",
    "crear superioridad",
    "generar superioridad",
    # transiciones
    "transicion ofensiva",
    "transicion defensiva",
    "transicion ataque defensa",
    "transicion defensa ataque",
    "ataque tras recuperacion",
    "defensa tras perdida",
    # ABP / balón parado
    "balon parado",
    "saque de banda",
    "saque de puerta",
    "saque de meta",
    "saque de esquina",
    "falta lateral",
    "falta frontal",
    "falta lejana",
    "corner ofensivo",
    "corner defensivo",
    "semi corner",
    # técnicos frecuentes
    "pase filtrado",
    "pase profundo",
    "centro al area",
    "remate de cabeza",
    "duelo 1v1",
    "duelos 1v1",
    "linea de pase",
    "lineas de pase",
    "fuera de juego",
    "achique de espacios",
    "basculacion defensiva",
    "marcaje individual",
    "marcaje zonal",
    "cobertura defensiva",
    # físicos / carga (aparecen en objetivos)
    "carga alta",
    "carga media",
    "carga baja",
    "fuerza potencia",
    "resistencia especifica",
)


def _strip_accents(text: str) -> str:
    nfkd = unicodedata.normalize("NFKD", text)
    return "".join(c for c in nfkd if not unicodedata.combining(c))


def _normalize_text(text: str) -> str:
    t = _strip_accents(text.lower().strip())
    t = t.replace("ñ", "n")
    # unificar separadores
    t = re.sub(r"[–—−]", "-", t)
    t = re.sub(r"[^\w\s\-+/]", " ", t, flags=re.UNICODE)
    t = re.sub(r"\s+", " ", t).strip()
    return t


def _tokenize(text: str) -> List[str]:
    if not text:
        return []
    # + / | ; , y espacios separan (1v1 se mantiene intacto)
    parts = re.split(r"[\s|/;,+]+", text)
    out: List[str] = []
    for p in parts:
        t = p.strip("-_")
        if t:
            out.append(t)
    return out


def _phrase_index() -> List[Tuple[Tuple[str, ...], str]]:
    """[(tokens..., canonical), ...] ordenado por longitud desc."""
    items: List[Tuple[Tuple[str, ...], str]] = []
    seen: Set[str] = set()
    for raw in _PHRASE_LEXICON:
        canon = _normalize_text(raw)
        if not canon or canon in seen:
            continue
        seen.add(canon)
        toks = tuple(_tokenize(canon))
        if toks:
            items.append((toks, canon))
    items.sort(key=lambda x: (-len(x[0]), x[1]))
    return items


_PHRASES = _phrase_index()


def _match_lexicon(tokens: Sequence[str]) -> Tuple[List[str], List[Optional[str]]]:
    """Longest-match lexicon sobre tokens. Devuelve (frases, tokens_restantes)."""
    n = len(tokens)
    consumed = [False] * n
    found: List[str] = []
    i = 0
    while i < n:
        matched = False
        for phrase_toks, canon in _PHRASES:
            L = len(phrase_toks)
            if i + L > n:
                continue
            if any(consumed[i : i + L]):
                continue
            if tuple(tokens[i : i + L]) == phrase_toks:
                found.append(canon)
                for j in range(i, i + L):
                    consumed[j] = True
                i += L
                matched = True
                break
        if not matched:
            i += 1
    remainder: List[Optional[str]] = [
        None if consumed[j] else tokens[j] for j in range(n)
    ]
    return found, remainder


def _is_atomic(tok: str) -> bool:
    """Tokens que no deben pegarse a vecinos (formatos, códigos)."""
    return tok in KEEP_SINGLE or bool(re.fullmatch(r"\d+v\d+", tok))


def _rake_candidates(remainder: Sequence[Optional[str]]) -> List[str]:
    """
    RAKE-like: agrupa secuencias de no-stopwords.
    Los None (ya consumidos por léxico) y stopwords cortan la frase.
    Tokens atómicos (1v1, rondo, abp…) no se fusionan entre sí.
    """
    candidates: List[str] = []
    buf: List[str] = []

    def flush():
        nonlocal buf
        if not buf:
            return
        while buf and buf[0] in STOPWORDS_ES:
            buf.pop(0)
        while buf and buf[-1] in STOPWORDS_ES:
            buf.pop()
        if not buf:
            return
        phrase = " ".join(buf)
        if _is_good_candidate(buf, phrase):
            candidates.append(phrase)
        buf = []

    for tok in remainder:
        if tok is None:
            flush()
            continue
        if tok in STOPWORDS_ES:
            flush()
            continue
        if _is_atomic(tok):
            flush()
            # atómico solo: emitir inmediatamente
            if _is_good_candidate([tok], tok):
                candidates.append(tok)
            continue
        buf.append(tok)
    flush()
    return candidates


def _is_good_candidate(tokens: Sequence[str], phrase: str) -> bool:
    if not tokens:
        return False
    if len(tokens) == 1:
        t = tokens[0]
        if t in KEEP_SINGLE:
            return True
        if t in WEAK_SINGLE or t in STOPWORDS_ES:
            return False
        if re.fullmatch(r"\d+v\d+", t):
            return True
        # unigramas: mínimo 4 chars (salvo KEEP)
        return len(t) >= 4
    # multi-palabra: al menos un token "fuerte"
    strong = [
        t
        for t in tokens
        if t not in WEAK_SINGLE and t not in STOPWORDS_ES and (len(t) >= 3 or t in KEEP_SINGLE)
    ]
    return len(strong) >= 1 and len(phrase) >= 5


def _normalize_manual(extra: str) -> Optional[str]:
    """Normaliza keyword manual preservando espacios de la frase."""
    if not extra or not str(extra).strip():
        return None
    t = _normalize_text(str(extra))
    if not t:
        return None
    # no pegar: solo colapsar espacios
    toks = _tokenize(t)
    if not toks:
        return None
    # filtrar si es solo stopwords
    if all(x in STOPWORDS_ES for x in toks):
        return None
    phrase = " ".join(toks)
    if len(toks) == 1 and toks[0] in WEAK_SINGLE and toks[0] not in KEEP_SINGLE:
        return None
    if len(phrase) < 2:
        return None
    return phrase


def normalize_keyword_list(keywords: Iterable[str] | None, *, max_keywords: int = 24) -> List[str]:
    """Dedup + normaliza lista ya elegida (manual o previa)."""
    out: List[str] = []
    seen: Set[str] = set()
    for raw in keywords or []:
        t = _normalize_manual(str(raw))
        if not t or t in seen:
            continue
        seen.add(t)
        out.append(t)
        if len(out) >= max_keywords:
            break
    return out


def synthesize_keywords(
    objetivo: str | None,
    extra: Iterable[str] | None = None,
    *,
    max_keywords: int = 16,
) -> List[str]:
    """Genera keyphrases filtrables a partir del objetivo (+ extras manuales)."""
    found: List[str] = []
    seen: Set[str] = set()

    def add(phrase: str) -> None:
        if phrase and phrase not in seen and len(found) < max_keywords:
            seen.add(phrase)
            found.append(phrase)

    if objetivo and str(objetivo).strip():
        norm = _normalize_text(str(objetivo))
        tokens = _tokenize(norm)
        lexicon_hits, remainder = _match_lexicon(tokens)
        for h in lexicon_hits:
            add(h)
        for cand in _rake_candidates(remainder):
            # unigramas ya cubiertos por una frase léxica → skip
            ctoks = cand.split()
            if len(ctoks) == 1 and any(ctoks[0] in h.split() for h in lexicon_hits):
                continue
            add(cand)

    if extra:
        for e in extra:
            t = _normalize_manual(str(e) if e is not None else "")
            if t:
                add(t)

    return found
