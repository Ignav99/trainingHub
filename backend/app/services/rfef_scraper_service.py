"""
TrainingHub Pro - Servicio de Scraping RFAF
Extrae clasificaciones, jornadas y resultados de la web de la RFAF (rfaf.es).
"""

import asyncio
import logging
import re
from datetime import datetime
from typing import Optional

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

# Mapping de desofuscación ntype() — dígitos ofuscados en resultados RFAF
# dígito_real = NTYPE_MAP[(row_index * 10) + digit_ofuscado]
NTYPE_MAP = [
    2, 5, 9, 4, 1, 0, 8, 6, 3, 7,
    1, 3, 5, 7, 9, 0, 2, 4, 6, 8,
    0, 2, 4, 6, 8, 1, 3, 5, 7, 9,
    7, 5, 2, 0, 9, 6, 3, 8, 4, 1,
]

BASE_URL = "https://www.rfaf.es/pnfg/NPcd"
LOGIN_URL = "https://www.rfaf.es/pnfg/NLogin"
CHARSET = "iso-8859-15"


def _decode_ntype(value: str, row_index: int) -> Optional[int]:
    """Desofusca un dígito usando el mapping ntype de la RFAF."""
    try:
        n = int(value)
        idx = (row_index % 4) * 10 + n
        if idx < len(NTYPE_MAP):
            return NTYPE_MAP[idx]
        return n
    except (ValueError, IndexError):
        return None


def _decode_result(text: str, row_index: int) -> Optional[int]:
    """Desofusca un resultado completo (puede ser multi-dígito)."""
    text = text.strip()
    if not text or text == "-":
        return None
    digits = []
    for ch in text:
        if ch.isdigit():
            decoded = _decode_ntype(ch, row_index)
            if decoded is not None:
                digits.append(str(decoded))
            else:
                digits.append(ch)
        else:
            digits.append(ch)
    try:
        return int("".join(digits))
    except ValueError:
        return None


def _safe_int(text: str) -> int:
    """Convierte texto a int, devuelve 0 si falla."""
    try:
        return int(text.strip())
    except (ValueError, AttributeError):
        return 0


def _extract_ultimos_5(cells) -> list[str]:
    """Extract últimos 5 results from table cells. Handles spans with title and plain text."""
    ultimos_5 = []

    for cell in cells:
        # Try spans with title attribute (Ganado/Empatado/Perdido)
        spans = cell.find_all("span", title=True)
        for span in spans:
            title = (span.get("title") or "").upper()
            letter = span.get_text(strip=True).upper()
            if title.startswith("GANAD") or letter == "G":
                ultimos_5.append("V")
            elif title.startswith("EMPAT") or letter == "E":
                ultimos_5.append("E")
            elif title.startswith("PERDID") or letter == "P":
                ultimos_5.append("D")
        if ultimos_5:
            return ultimos_5

    # Fallback: try plain text like "GGPEG"
    for cell in cells:
        text = cell.get_text(strip=True).upper()
        if 3 <= len(text) <= 5 and all(c in "GEP" for c in text):
            for c in text:
                if c == "G":
                    ultimos_5.append("V")
                elif c == "E":
                    ultimos_5.append("E")
                elif c == "P":
                    ultimos_5.append("D")
            return ultimos_5

    return ultimos_5


def _extract_params_from_url(url: str) -> dict:
    """Extrae codcompeticion, codgrupo, codtemporada de una URL RFAF."""
    params = {}
    patterns = {
        "codcompeticion": r"[Cc]od[Cc]ompeticion=(\d+)",
        "codgrupo": r"[Cc]od[Gg]rupo=(\d+)",
        "codtemporada": r"[Cc]od[Tt]emporada=(\d+)",
    }
    for key, pattern in patterns.items():
        match = re.search(pattern, url, re.IGNORECASE)
        if match:
            params[key] = match.group(1)
    return params


class RFAFScraper:
    """Scraper para la web de la RFAF (Federación Andaluza de Fútbol)."""

    def __init__(self):
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Obtiene un cliente HTTP con cookie de sesión RFAF."""
        if self._client is not None:
            return self._client

        self._client = httpx.AsyncClient(
            timeout=30.0,
            follow_redirects=True,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "text/html,application/xhtml+xml",
                "Accept-Language": "es-ES,es;q=0.9",
            },
        )

        # Obtener cookie de sesión (JSESSIONID)
        try:
            await self._client.get(LOGIN_URL)
            logger.info("RFAF session cookie obtained")
        except httpx.HTTPError as e:
            logger.warning("Failed to get RFAF session cookie: %s", e)

        return self._client

    async def close(self):
        """Cierra el cliente HTTP."""
        if self._client:
            await self._client.aclose()
            self._client = None

    async def _fetch_page(self, action: str, params: dict) -> BeautifulSoup:
        """Fetch and parse an RFAF page. Action is the page name (e.g. NFG_VisClasificacion)."""
        client = await self._get_client()
        full_params = {"cod_primaria": "1000120", **params}
        url = f"{BASE_URL}/{action}"

        response = await client.get(url, params=full_params)
        response.raise_for_status()

        html = response.content.decode(CHARSET, errors="replace")
        return BeautifulSoup(html, "html.parser")

    async def scrape_clasificacion(
        self,
        codcompeticion: str,
        codgrupo: str,
        codtemporada: str = "21",
    ) -> list[dict]:
        """
        Scrape de la tabla de clasificación de un grupo.
        Delegates to scrape_clasificacion_full and returns just the classification list.
        """
        data = await self.scrape_clasificacion_full(codcompeticion, codgrupo, codtemporada)
        return data["clasificacion"]

    async def scrape_jornada(
        self,
        codcompeticion: str,
        codgrupo: str,
        codjornada: str,
        codtemporada: str = "21",
    ) -> dict:
        """
        Scrape de una jornada concreta: partidos con resultados.

        Two possible sources:
        1. Dedicated jornada page (NFG_CmpJornada) — may have 5+ cells with date/time/field
        2. Results table inside clasificación page — 3 cells: local, resultado, visitante
        """
        soup = await self._fetch_page("NFG_CmpJornada", {
            "CodGrupo": codgrupo,
            "CodCompeticion": codcompeticion,
            "CodJornada": codjornada,
        })

        partidos = self._parse_partidos_from_soup(soup)

        logger.info(
            "Scraped jornada %s: %d partidos (comp=%s, grupo=%s)",
            codjornada, len(partidos), codcompeticion, codgrupo,
        )
        return {"numero": int(codjornada), "partidos": partidos}

    def _parse_partidos_from_soup(self, soup: BeautifulSoup) -> list[dict]:
        """
        Parse match results from a jornada page.

        Structure: multiple small tables (no class), each 2 rows:
          Row 0: [local (td_widget), result_cell, visitante (td_widget)]
          Row 1: [campo (colspan)]

        The result_cell contains:
          - Result digits inside <span class="ntype"> with ntype() obfuscation and display:none decoys
          - Date in <span class="horario">DD-MM-YYYY</span>
          - Time in <span class="horario">HH:MM</span>
        """
        partidos = []
        seen_pairs = set()

        # Only use small per-match tables (no class attribute), skip the big container table
        tables = soup.find_all("table")
        small_tables = [t for t in tables if not t.get("class")]

        for table in small_tables:
            rows = table.find_all("tr")
            if not rows:
                continue

            row = rows[0]
            widget_cells = row.find_all("td", class_="td_widget")
            if len(widget_cells) < 2:
                continue

            local = widget_cells[0].get_text(strip=True)
            visitante = widget_cells[1].get_text(strip=True)

            if not local or not visitante or local.lower() == "descansa":
                continue

            pair_key = (local, visitante)
            if pair_key in seen_pairs:
                continue
            seen_pairs.add(pair_key)

            # Find the middle cell (between the two widget cells)
            all_cells = row.find_all("td")
            middle_cell = None
            for cell in all_cells:
                cls = cell.get("class", [])
                if "td_widget" not in cls and not cell.get("colspan"):
                    middle_cell = cell
                    break

            goles_local = None
            goles_visitante = None
            fecha = ""
            hora = ""

            if middle_cell:
                # Extract result from ntype span — get visible digits only (skip display:none)
                ntype_span = middle_cell.find(
                    "span", class_=lambda c: c and "ntype" in " ".join(c) if isinstance(c, list) else c and "ntype" in c
                )
                if ntype_span:
                    # Get all visible text nodes, skipping display:none elements
                    visible_digits = []
                    for element in ntype_span.descendants:
                        if isinstance(element, str):
                            continue
                        # Skip elements with display:none
                        style = (element.get("style") or "").lower()
                        if "display:none" in style.replace(" ", ""):
                            continue
                        # Get direct text of visible span/i elements
                        if element.name in ("span", "i") and element.string:
                            text = element.string.strip()
                            if text.isdigit():
                                visible_digits.append(text)

                    # If we got digits from visible spans, great
                    # Otherwise fall back to getting text and looking for the result pattern
                    if len(visible_digits) >= 2:
                        goles_local = int(visible_digits[0])
                        goles_visitante = int(visible_digits[-1])
                    else:
                        # The ntype text includes hidden digits too. Try extracting
                        # from fa-N class names on visible <i> elements
                        fa_digits = []
                        for i_elem in ntype_span.find_all("i", class_=re.compile(r"fa-\d")):
                            style = (i_elem.get("style") or "").lower()
                            if "display:none" not in style.replace(" ", ""):
                                for cls in i_elem.get("class", []):
                                    m = re.match(r"fa-(\d)", cls)
                                    if m:
                                        fa_digits.append(m.group(1))
                        if len(fa_digits) >= 2:
                            goles_local = int(fa_digits[0])
                            goles_visitante = int(fa_digits[-1])

                # Also look for a "-" between two visible numbers as fallback
                if goles_local is None:
                    strong = middle_cell.find("strong")
                    if strong:
                        text = strong.get_text(strip=True)
                        m = re.match(r"(\d+)\s*-\s*(\d+)", text)
                        if m:
                            goles_local = int(m.group(1))
                            goles_visitante = int(m.group(2))

                # Extract date and time from <span class="horario"> elements
                horarios = middle_cell.find_all("span", class_="horario")
                for h in horarios:
                    text = h.get_text(strip=True)
                    if re.match(r"\d{2}-\d{2}-\d{4}", text):
                        fecha = text
                    elif re.match(r"\d{2}:\d{2}", text):
                        hora = text

            # Get campo from second row
            campo = ""
            if len(rows) > 1:
                campo_cell = rows[1].find("td", colspan=True)
                if campo_cell:
                    campo = campo_cell.get_text(strip=True)

            partidos.append({
                "local": local,
                "visitante": visitante,
                "goles_local": goles_local,
                "goles_visitante": goles_visitante,
                "fecha": fecha,
                "hora": hora,
                "campo": campo,
            })

        return partidos

    async def scrape_calendario(
        self,
        codcompeticion: str,
        codgrupo: str,
        codtemporada: str = "21",
    ) -> list[dict]:
        """
        Scrape del calendario. The calendario page has tables for each jornada.
        We look for jornada headers (h3/h4 or bold text) and the match tables under them.
        """
        soup = await self._fetch_page("NFG_VisCalendario_Vis", {
            "codtemporada": codtemporada,
            "codcompeticion": codcompeticion,
            "codgrupo": codgrupo,
        })

        jornadas = []

        # Method 1: Find all "Jornada N" text patterns in any element
        jornada_pattern = re.compile(r"Jornada\s+(\d+)", re.IGNORECASE)

        # Search in text nodes, headers, and bold elements
        for element in soup.find_all(string=jornada_pattern):
            match = jornada_pattern.search(element)
            if match:
                num = int(match.group(1))
                if num not in {j["numero"] for j in jornadas}:
                    jornadas.append({
                        "numero": num,
                        "texto": f"Jornada {num}",
                    })

        # Method 2: Look for IrA(N) JavaScript calls (present on clasificación page)
        if not jornadas:
            scripts = soup.find_all("script")
            for script in scripts:
                text = script.string or ""
                for match in re.finditer(r"IrA\((\d+)\)", text):
                    num = int(match.group(1))
                    if num not in {j["numero"] for j in jornadas}:
                        jornadas.append({"numero": num, "texto": f"Jornada {num}"})

        # Method 3: Find links to NFG_CmpJornada with jornada numbers
        for link in soup.find_all("a", href=True):
            href = link.get("href", "")
            match = re.search(r"CodJornada=(\d+)", href, re.IGNORECASE)
            if match:
                num = int(match.group(1))
                if num > 0 and num not in {j["numero"] for j in jornadas}:
                    jornadas.append({
                        "numero": num,
                        "texto": link.get_text(strip=True) or f"Jornada {num}",
                    })

        jornadas.sort(key=lambda j: j["numero"])
        logger.info(
            "Scraped calendario: %d jornadas (comp=%s, grupo=%s)",
            len(jornadas), codcompeticion, codgrupo,
        )
        return jornadas

    async def scrape_goleadores(
        self,
        codcompeticion: str,
        codgrupo: str,
        codtemporada: str = "21",
    ) -> list[dict]:
        """
        Scrape del ranking de goleadores.
        Table structure: [Jugador, Equipo, Grupo, PJ, Goles, Goles/partido]
        Goles cell may contain penalty info like "14(2 P)".
        """
        soup = await self._fetch_page("NFG_CMP_Goleadores", {
            "codcompeticion": codcompeticion,
            "codgrupo": codgrupo,
        })

        goleadores = []

        tables = soup.find_all("table")
        for table in tables:
            rows = table.find_all("tr")
            for row in rows:
                cells = row.find_all("td")
                if len(cells) < 5:
                    continue

                texts = [c.get_text(strip=True) for c in cells]

                jugador = texts[0]
                equipo = texts[1] if len(texts) > 1 else ""
                # Goles is in column 4 (index 4), may have "(X P)" suffix for penalties
                goles_text = texts[4] if len(texts) > 4 else ""
                # Extract the leading number: "14(2 P)" -> 14
                goles_match = re.match(r"(\d+)", goles_text)
                goles = int(goles_match.group(1)) if goles_match else 0

                pj = _safe_int(texts[3]) if len(texts) > 3 else 0

                if jugador and goles > 0:
                    goleadores.append({
                        "jugador": jugador,
                        "equipo": equipo,
                        "goles": goles,
                        "pj": pj,
                    })

        # Already sorted from RFAF but ensure
        goleadores.sort(key=lambda g: g["goles"], reverse=True)

        logger.info(
            "Scraped goleadores: %d jugadores (comp=%s, grupo=%s)",
            len(goleadores), codcompeticion, codgrupo,
        )
        return goleadores

    async def scrape_clasificacion_full(
        self,
        codcompeticion: str,
        codgrupo: str,
        codtemporada: str = "21",
    ) -> dict:
        """
        Scrape de clasificación + resultados de la última jornada (embebidos en la misma página).
        Returns dict with 'clasificacion' list and 'jornada_resultados' list.
        """
        soup = await self._fetch_page("NFG_VisClasificacion", {
            "codgrupo": codgrupo,
            "codcompeticion": codcompeticion,
            "codtemporada": codtemporada,
        })

        # Parse clasificación from table-bordered tables
        clasificacion = []
        tables_bordered = soup.find_all("table", class_=lambda c: c and "table-bordered" in c)
        target_table = tables_bordered[0] if tables_bordered else None

        if target_table:
            clasificacion = self._parse_clasificacion_table(target_table)

        # Parse jornada results from the non-bordered table (table-hover)
        jornada_resultados = []
        tables_hover = soup.find_all("table", class_=lambda c: c and "table-hover" in c)
        if tables_hover:
            jornada_resultados = self._parse_partidos_from_table(tables_hover[0])

        # Extract current jornada number from JS: IrA() or VerResultados() functions
        jornada_num = None
        scripts = soup.find_all("script")
        for script in scripts:
            text = script.string or ""
            match = re.search(r"CodJornada=(\d+)", text)
            if match:
                jornada_num = int(match.group(1))
                break

        return {
            "clasificacion": clasificacion,
            "jornada_resultados": jornada_resultados,
            "jornada_num": jornada_num,
        }

    def _parse_clasificacion_table(self, table) -> list[dict]:
        """Parse a classification table into list of team dicts."""
        clasificacion = []
        rows = table.find_all("tr")

        # Detect if detailed (16 cells) or summary (10 cells)
        is_detailed = False
        for row in rows[2:3]:
            cells = row.find_all("td")
            if len(cells) >= 14:
                is_detailed = True
                break

        for row in rows:
            cells = row.find_all("td")
            if len(cells) < 8:
                continue

            texts = [c.get_text(strip=True) for c in cells]

            posicion = _safe_int(texts[1])
            equipo = texts[2]

            if not equipo or posicion == 0:
                continue

            # Extract últimos 5 from spans with title or plain text
            ultimos_5 = _extract_ultimos_5(cells)

            if is_detailed and len(texts) >= 15:
                equipo_data = {
                    "posicion": posicion,
                    "equipo": equipo,
                    "puntos": _safe_int(texts[3]),
                    "pj": _safe_int(texts[4]) + _safe_int(texts[8]),
                    "pg": _safe_int(texts[5]) + _safe_int(texts[9]),
                    "pe": _safe_int(texts[6]) + _safe_int(texts[10]),
                    "pp": _safe_int(texts[7]) + _safe_int(texts[11]),
                    "gf": _safe_int(texts[12]),
                    "gc": _safe_int(texts[13]),
                    "pg_casa": _safe_int(texts[5]),
                    "pe_casa": _safe_int(texts[6]),
                    "pp_casa": _safe_int(texts[7]),
                    "pg_fuera": _safe_int(texts[9]),
                    "pe_fuera": _safe_int(texts[10]),
                    "pp_fuera": _safe_int(texts[11]),
                }
            else:
                equipo_data = {
                    "posicion": posicion,
                    "equipo": equipo,
                    "puntos": _safe_int(texts[3]),
                    "pj": _safe_int(texts[4]),
                    "pg": _safe_int(texts[5]),
                    "pe": _safe_int(texts[6]),
                    "pp": _safe_int(texts[7]),
                    "gf": 0,
                    "gc": 0,
                }

            if ultimos_5:
                equipo_data["ultimos_5"] = ultimos_5

            clasificacion.append(equipo_data)

        return clasificacion

    def _parse_partidos_from_table(self, table) -> list[dict]:
        """Parse match results from a single table element."""
        partidos = []
        rows = table.find_all("tr")

        for row_idx, row in enumerate(rows):
            cells = row.find_all("td")
            if len(cells) < 3:
                continue

            texts = [c.get_text(strip=True) for c in cells]
            local = texts[0]

            if local.lower() in ("descansa", ""):
                continue

            result_cell = cells[1]
            result_text = result_cell.get_text(strip=True)
            goles_local = None
            goles_visitante = None

            # Check ntype obfuscation
            ntype_spans = result_cell.find_all(
                "span", class_=lambda c: c and "ntype" in str(c)
            )
            if ntype_spans:
                decoded_digits = []
                for span in ntype_spans:
                    decoded = _decode_ntype(span.get_text(strip=True), row_idx)
                    if decoded is not None:
                        decoded_digits.append(str(decoded))
                if len(decoded_digits) >= 2:
                    goles_local = int(decoded_digits[0])
                    goles_visitante = int(decoded_digits[-1])
            elif "-" in result_text and result_text != "-":
                parts = result_text.split("-")
                if len(parts) == 2 and parts[0].strip().isdigit() and parts[1].strip().isdigit():
                    goles_local = int(parts[0].strip())
                    goles_visitante = int(parts[1].strip())

            visitante = texts[2] if len(texts) > 2 else ""
            fecha = texts[3] if len(texts) > 3 else ""
            hora = texts[4] if len(texts) > 4 else ""
            campo = texts[5] if len(texts) > 5 else ""

            if local and visitante:
                partidos.append({
                    "local": local,
                    "visitante": visitante,
                    "goles_local": goles_local,
                    "goles_visitante": goles_visitante,
                    "fecha": fecha,
                    "hora": hora,
                    "campo": campo,
                })

        return partidos

    async def sync_competicion(
        self,
        codcompeticion: str,
        codgrupo: str,
        codtemporada: str = "21",
    ) -> dict:
        """
        Sync completo de una competición: clasificación + resultados (1 request),
        calendario y goleadores.
        """
        # Single request gets both clasificación AND current jornada results
        full_data = await self.scrape_clasificacion_full(
            codcompeticion, codgrupo, codtemporada
        )
        clasificacion = full_data["clasificacion"]
        jornada_resultados = full_data["jornada_resultados"]
        jornada_num = full_data["jornada_num"]

        jornada_actual = None
        if jornada_resultados and jornada_num:
            jornada_actual = {"numero": jornada_num, "partidos": jornada_resultados}

        calendario_jornadas = await self.scrape_calendario(
            codcompeticion, codgrupo, codtemporada
        )

        goleadores = await self.scrape_goleadores(
            codcompeticion, codgrupo, codtemporada
        )

        return {
            "clasificacion": clasificacion,
            "calendario": [
                {"numero": j["numero"], "texto": j.get("texto", f"Jornada {j['numero']}")}
                for j in calendario_jornadas
            ],
            "jornada_actual": jornada_actual,
            "goleadores": goleadores,
            "sincronizado_en": datetime.utcnow().isoformat(),
        }

    async def sync_competicion_full(
        self,
        codcompeticion: str,
        codgrupo: str,
        codtemporada: str = "21",
    ) -> dict:
        """
        Sync completo: clasificación + TODAS las jornadas (iterando calendario) + goleadores.
        Delay de 0.5s entre jornadas para no saturar RFAF.
        """
        # Get clasificación + current jornada results
        full_data = await self.scrape_clasificacion_full(
            codcompeticion, codgrupo, codtemporada
        )
        clasificacion = full_data["clasificacion"]

        # Get calendario to know all jornada numbers
        calendario_jornadas = await self.scrape_calendario(
            codcompeticion, codgrupo, codtemporada
        )

        # Get goleadores
        goleadores = await self.scrape_goleadores(
            codcompeticion, codgrupo, codtemporada
        )

        # Scrape ALL jornadas
        jornadas = []
        for j_info in calendario_jornadas:
            num = j_info["numero"]
            try:
                jornada = await self.scrape_jornada(
                    codcompeticion, codgrupo, str(num), codtemporada
                )
                jornadas.append(jornada)
                # Delay between requests to avoid hammering RFAF
                await asyncio.sleep(0.5)
            except Exception as e:
                logger.warning("Error scraping jornada %d: %s", num, e)
                continue

        logger.info(
            "Full sync complete: %d jornadas scraped (comp=%s, grupo=%s)",
            len(jornadas), codcompeticion, codgrupo,
        )

        return {
            "clasificacion": clasificacion,
            "calendario": [
                {"numero": j["numero"], "texto": j.get("texto", f"Jornada {j['numero']}")}
                for j in calendario_jornadas
            ],
            "jornadas": jornadas,
            "goleadores": goleadores,
            "sincronizado_en": datetime.utcnow().isoformat(),
        }

    @staticmethod
    def parse_url(url: str) -> dict:
        """Extrae parámetros RFAF de una URL pegada por el usuario."""
        return _extract_params_from_url(url)
