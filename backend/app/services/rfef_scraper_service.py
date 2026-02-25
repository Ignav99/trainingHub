"""
TrainingHub Pro - Servicio de Scraping RFAF (v2)
Uses requests.Session for proper JSESSIONID cookie handling.
Scores from clasificación page (plain text in <b> tags, no obfuscation).
Full acta parsing for match details.
"""

import asyncio
import logging
import re
import time
from datetime import datetime
from typing import Optional

import requests
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
RFAF_BASE = "https://www.rfaf.es"
CHARSET = "iso-8859-15"


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
    """Scraper para la web de la RFAF (Federación Andaluza de Fútbol).

    v2: Uses requests.Session for proper JSESSIONID cookie handling.
    Scores from clasificación page (plain text in <b> tags, no obfuscation).
    """

    def __init__(self):
        self._session = requests.Session()
        self._session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "es-ES,es;q=0.9",
        })
        self._warmed_up = False

    def _warmup(self):
        """Obtiene cookie de sesión JSESSIONID haciendo una petición inicial."""
        if self._warmed_up:
            return
        try:
            self._session.get(LOGIN_URL, timeout=15)
            self._warmed_up = True
            logger.info("RFAF session cookie obtained (JSESSIONID)")
        except Exception as e:
            logger.warning("Failed to get RFAF session cookie: %s", e)

    def _fetch_page(self, action: str, params: dict) -> BeautifulSoup:
        """Fetch and parse an RFAF page (sync, using requests.Session)."""
        self._warmup()
        full_params = {"cod_primaria": "1000120", **params}
        url = f"{BASE_URL}/{action}"

        response = self._session.get(url, params=full_params, timeout=30)
        response.raise_for_status()

        html = response.content.decode(CHARSET, errors="replace")
        if len(html) < 100:
            logger.warning(
                "RFAF page %s returned very small response (%d bytes)", action, len(html)
            )
        return BeautifulSoup(html, "html.parser")

    async def close(self):
        """Cierra la sesión HTTP."""
        self._session.close()

    # ========================================================================
    # Async public methods (wrap sync implementations in a thread)
    # ========================================================================

    async def scrape_clasificacion(
        self,
        codcompeticion: str,
        codgrupo: str,
        codtemporada: str = "21",
    ) -> list[dict]:
        """Clasificación standings."""
        data = await asyncio.to_thread(
            self._scrape_clasificacion_full, codcompeticion, codgrupo, codtemporada
        )
        return data["clasificacion"]

    async def scrape_clasificacion_full(
        self,
        codcompeticion: str,
        codgrupo: str,
        codtemporada: str = "21",
    ) -> dict:
        """Clasificación + jornada results from clasificación page."""
        return await asyncio.to_thread(
            self._scrape_clasificacion_full, codcompeticion, codgrupo, codtemporada
        )

    async def scrape_jornada_results(
        self,
        codcompeticion: str,
        codgrupo: str,
        codjornada: str,
        codtemporada: str = "21",
    ) -> dict:
        """Scores from clasificación page (plain text, no obfuscation) + cod_acta links."""
        return await asyncio.to_thread(
            self._scrape_jornada_results, codcompeticion, codgrupo, codjornada, codtemporada
        )

    async def scrape_jornada(
        self,
        codcompeticion: str,
        codgrupo: str,
        codjornada: str,
        codtemporada: str = "21",
    ) -> dict:
        """Date/time/field from dedicated jornada page."""
        return await asyncio.to_thread(
            self._scrape_jornada, codcompeticion, codgrupo, codjornada, codtemporada
        )

    async def scrape_jornada_combined(
        self,
        codcompeticion: str,
        codgrupo: str,
        codjornada: str,
        codtemporada: str = "21",
    ) -> dict:
        """Scores from clasificación + date/time/field from jornada page, merged."""
        return await asyncio.to_thread(
            self._scrape_jornada_combined, codcompeticion, codgrupo, codjornada, codtemporada
        )

    async def scrape_calendario(
        self,
        codcompeticion: str,
        codgrupo: str,
        codtemporada: str = "21",
    ) -> list[dict]:
        return await asyncio.to_thread(
            self._scrape_calendario, codcompeticion, codgrupo, codtemporada
        )

    async def scrape_goleadores(
        self,
        codcompeticion: str,
        codgrupo: str,
        codtemporada: str = "21",
    ) -> list[dict]:
        return await asyncio.to_thread(
            self._scrape_goleadores, codcompeticion, codgrupo, codtemporada
        )

    async def scrape_acta(self, cod_acta: str) -> dict:
        """Parse a complete match report (acta)."""
        return await asyncio.to_thread(self._scrape_acta, cod_acta)

    async def sync_competicion(
        self,
        codcompeticion: str,
        codgrupo: str,
        codtemporada: str = "21",
    ) -> dict:
        return await asyncio.to_thread(
            self._sync_competicion, codcompeticion, codgrupo, codtemporada
        )

    async def sync_competicion_full(
        self,
        codcompeticion: str,
        codgrupo: str,
        codtemporada: str = "21",
    ) -> dict:
        return await asyncio.to_thread(
            self._sync_competicion_full, codcompeticion, codgrupo, codtemporada
        )

    @staticmethod
    def parse_url(url: str) -> dict:
        """Extrae parámetros RFAF de una URL pegada por el usuario."""
        return _extract_params_from_url(url)

    # ========================================================================
    # Sync implementations
    # ========================================================================

    def _scrape_clasificacion_full(self, codcompeticion, codgrupo, codtemporada="21"):
        """Classification + jornada results from clasificación page."""
        soup = self._fetch_page("NFG_VisClasificacion", {
            "codgrupo": codgrupo,
            "codcompeticion": codcompeticion,
            "codtemporada": codtemporada,
        })

        clasificacion = self._parse_clasificacion_table(soup)
        jornada_resultados = self._parse_results_from_clasificacion(soup)
        jornada_num = self._extract_jornada_num(soup)

        return {
            "clasificacion": clasificacion,
            "jornada_resultados": jornada_resultados,
            "jornada_num": jornada_num,
        }

    def _scrape_jornada_results(self, codcompeticion, codgrupo, codjornada, codtemporada="21"):
        """Get scores from clasificación page for a specific jornada.

        Uses NFG_VisClasificacion?codjornada=N which shows results for jornada N
        with plain text scores in <b> tags and links to actas.
        """
        soup = self._fetch_page("NFG_VisClasificacion", {
            "codgrupo": codgrupo,
            "codcompeticion": codcompeticion,
            "codtemporada": codtemporada,
            "codjornada": codjornada,
        })
        results = self._parse_results_from_clasificacion(soup)
        logger.info(
            "Scraped jornada %s results: %d partidos (scores from clasificación)",
            codjornada, len(results),
        )
        return {"numero": int(codjornada), "partidos": results}

    def _scrape_jornada(self, codcompeticion, codgrupo, codjornada, codtemporada="21"):
        """Get date/time/field from dedicated jornada page (NFG_CmpJornada).

        Does NOT extract scores — use clasificación page for reliable scores.
        """
        soup = self._fetch_page("NFG_CmpJornada", {
            "CodGrupo": codgrupo,
            "CodCompeticion": codcompeticion,
            "CodJornada": codjornada,
        })
        partidos = self._parse_jornada_page(soup)
        logger.info(
            "Scraped jornada %s details: %d partidos (fecha/hora/campo)",
            codjornada, len(partidos),
        )
        return {"numero": int(codjornada), "partidos": partidos}

    def _scrape_jornada_combined(self, codcompeticion, codgrupo, codjornada, codtemporada="21"):
        """Combine reliable scores (from clasificación) + date/time/field (from jornada page)."""
        results = self._scrape_jornada_results(codcompeticion, codgrupo, codjornada, codtemporada)
        time.sleep(0.3)
        details = self._scrape_jornada(codcompeticion, codgrupo, codjornada, codtemporada)
        merged = self._merge_jornada_data(results["partidos"], details["partidos"])
        return {"numero": int(codjornada), "partidos": merged}

    def _scrape_calendario(self, codcompeticion, codgrupo, codtemporada="21"):
        """Scrape del calendario — jornada numbers list."""
        soup = self._fetch_page("NFG_VisCalendario_Vis", {
            "codtemporada": codtemporada,
            "codcompeticion": codcompeticion,
            "codgrupo": codgrupo,
        })

        jornadas = []
        jornada_pattern = re.compile(r"Jornada\s+(\d+)", re.IGNORECASE)

        for element in soup.find_all(string=jornada_pattern):
            match = jornada_pattern.search(element)
            if match:
                num = int(match.group(1))
                if num not in {j["numero"] for j in jornadas}:
                    jornadas.append({"numero": num, "texto": f"Jornada {num}"})

        if not jornadas:
            scripts = soup.find_all("script")
            for script in scripts:
                text = script.string or ""
                for match in re.finditer(r"IrA\((\d+)\)", text):
                    num = int(match.group(1))
                    if num not in {j["numero"] for j in jornadas}:
                        jornadas.append({"numero": num, "texto": f"Jornada {num}"})

        if not jornadas:
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
        logger.info("Scraped calendario: %d jornadas", len(jornadas))
        return jornadas

    def _scrape_goleadores(self, codcompeticion, codgrupo, codtemporada="21"):
        """Scrape del ranking de goleadores."""
        soup = self._fetch_page("NFG_CMP_Goleadores", {
            "codcompeticion": codcompeticion,
            "codgrupo": codgrupo,
        })

        goleadores = []
        for table in soup.find_all("table"):
            rows = table.find_all("tr")
            for row in rows:
                cells = row.find_all("td")
                if len(cells) < 5:
                    continue
                texts = [c.get_text(strip=True) for c in cells]
                jugador = texts[0]
                equipo = texts[1] if len(texts) > 1 else ""
                goles_text = texts[4] if len(texts) > 4 else ""
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

        goleadores.sort(key=lambda g: g["goles"], reverse=True)
        logger.info("Scraped goleadores: %d jugadores", len(goleadores))
        return goleadores

    def _scrape_acta(self, cod_acta: str) -> dict:
        """Parse a complete match report (acta)."""
        soup = self._fetch_page("NFG_CmpPartido", {"CodActa": cod_acta})
        return self._parse_acta(soup, cod_acta)

    def _sync_competicion(self, codcompeticion, codgrupo, codtemporada="21"):
        """Quick sync: clasificación + current jornada (with merged details) + goleadores."""
        full_data = self._scrape_clasificacion_full(codcompeticion, codgrupo, codtemporada)
        clasificacion = full_data["clasificacion"]
        jornada_resultados = full_data["jornada_resultados"]
        jornada_num = full_data["jornada_num"]

        jornada_actual = None
        if jornada_resultados and jornada_num:
            try:
                time.sleep(0.3)
                jornada_details = self._scrape_jornada(
                    codcompeticion, codgrupo, str(jornada_num), codtemporada
                )
                merged = self._merge_jornada_data(jornada_resultados, jornada_details["partidos"])
                jornada_actual = {"numero": jornada_num, "partidos": merged}
            except Exception as e:
                logger.warning("Error getting jornada details: %s", e)
                jornada_actual = {"numero": jornada_num, "partidos": jornada_resultados}

        time.sleep(0.3)
        calendario = self._scrape_calendario(codcompeticion, codgrupo, codtemporada)
        time.sleep(0.3)
        goleadores = self._scrape_goleadores(codcompeticion, codgrupo, codtemporada)

        return {
            "clasificacion": clasificacion,
            "calendario": [
                {"numero": j["numero"], "texto": j.get("texto", f"Jornada {j['numero']}")}
                for j in calendario
            ],
            "jornada_actual": jornada_actual,
            "goleadores": goleadores,
            "sincronizado_en": datetime.utcnow().isoformat(),
        }

    def _sync_competicion_full(self, codcompeticion, codgrupo, codtemporada="21"):
        """Full sync: clasificación + ALL jornadas + goleadores.

        Uses clasificación page for scores (plain text, reliable) and
        jornada pages for fecha/hora/campo. Combines both data sources.
        """
        # 1. Classification + current jornada
        full_data = self._scrape_clasificacion_full(codcompeticion, codgrupo, codtemporada)
        clasificacion = full_data["clasificacion"]

        # 2. Calendario (jornada numbers)
        time.sleep(0.3)
        calendario = self._scrape_calendario(codcompeticion, codgrupo, codtemporada)

        # 3. Goleadores
        time.sleep(0.3)
        goleadores = self._scrape_goleadores(codcompeticion, codgrupo, codtemporada)

        # 4. Scrape ALL jornadas (scores from clasificación + details from jornada page)
        jornadas = []
        for j_info in calendario:
            num = j_info["numero"]
            try:
                # Get reliable scores from clasificación page
                time.sleep(0.5)
                results = self._scrape_jornada_results(
                    codcompeticion, codgrupo, str(num), codtemporada
                )

                # Get fecha/hora/campo from jornada page
                time.sleep(0.5)
                try:
                    details = self._scrape_jornada(
                        codcompeticion, codgrupo, str(num), codtemporada
                    )
                    merged = self._merge_jornada_data(results["partidos"], details["partidos"])
                    jornadas.append({"numero": num, "partidos": merged})
                except Exception:
                    # If jornada page fails, still save scores
                    jornadas.append(results)

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
                for j in calendario
            ],
            "jornadas": jornadas,
            "goleadores": goleadores,
            "sincronizado_en": datetime.utcnow().isoformat(),
        }

    # ========================================================================
    # Parsing helpers
    # ========================================================================

    def _parse_clasificacion_table(self, soup: BeautifulSoup) -> list[dict]:
        """Parse classification table from the clasificación page."""
        clasificacion = []
        tables_bordered = soup.find_all(
            "table", class_=lambda c: c and "table-bordered" in c
        )
        target_table = tables_bordered[0] if tables_bordered else None

        if not target_table:
            return clasificacion

        rows = target_table.find_all("tr")

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

    def _parse_results_from_clasificacion(self, soup: BeautifulSoup) -> list[dict]:
        """Parse match results from the clasificación page's results table.

        Scores are in <b> tags (plain text, no obfuscation).
        Also extracts CodActa links for detailed match data.
        """
        partidos = []

        tables_hover = soup.find_all(
            "table", class_=lambda c: c and "table-hover" in c
        )
        if not tables_hover:
            return partidos

        table = tables_hover[0]
        rows = table.find_all("tr")

        for row in rows:
            cells = row.find_all("td")
            if len(cells) < 3:
                continue

            local = cells[0].get_text(strip=True)
            if not local or local.lower() in ("descansa", "descanso", ""):
                continue

            result_cell = cells[1]
            visitante = cells[2].get_text(strip=True) if len(cells) > 2 else ""

            if not visitante or visitante.lower() in ("descansa", "descanso"):
                continue

            # Extract scores from <b> tags (plain text, no obfuscation)
            goles_local = None
            goles_visitante = None
            bold_tags = result_cell.find_all("b")
            if len(bold_tags) >= 2:
                try:
                    goles_local = int(bold_tags[0].get_text(strip=True))
                    goles_visitante = int(bold_tags[1].get_text(strip=True))
                except ValueError:
                    pass

            # Fallback: try plain text "N - N" pattern
            if goles_local is None:
                result_text = result_cell.get_text(strip=True)
                m = re.match(r"(\d+)\s*-\s*(\d+)", result_text)
                if m:
                    goles_local = int(m.group(1))
                    goles_visitante = int(m.group(2))

            # Extract CodActa from link
            cod_acta = None
            link = result_cell.find("a", href=True)
            if not link:
                link = row.find("a", href=True)
            if link:
                href = link.get("href", "")
                acta_match = re.search(r"CodActa=(\d+)", href, re.IGNORECASE)
                if acta_match:
                    cod_acta = acta_match.group(1)

            partidos.append({
                "local": local,
                "visitante": visitante,
                "goles_local": goles_local,
                "goles_visitante": goles_visitante,
                "cod_acta": cod_acta,
                "fecha": "",
                "hora": "",
                "campo": "",
            })

        return partidos

    def _parse_jornada_page(self, soup: BeautifulSoup) -> list[dict]:
        """Parse date/time/field from a jornada page (NFG_CmpJornada).

        Does NOT extract scores (clasificación page is used for reliable scores).
        """
        partidos = []
        seen_pairs = set()

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

            # Find middle cell for date/time info
            all_cells = row.find_all("td")
            middle_cell = None
            for cell in all_cells:
                cls = cell.get("class", [])
                if "td_widget" not in cls and not cell.get("colspan"):
                    middle_cell = cell
                    break

            fecha = ""
            hora = ""

            if middle_cell:
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
                "fecha": fecha,
                "hora": hora,
                "campo": campo,
            })

        return partidos

    def _merge_jornada_data(self, results: list[dict], details: list[dict]) -> list[dict]:
        """Merge scores from clasificación with fecha/hora/campo from jornada page."""
        details_lookup = {}
        for p in details:
            key = (p.get("local", "").lower().strip(), p.get("visitante", "").lower().strip())
            details_lookup[key] = p

        merged = []
        for p in results:
            key = (p.get("local", "").lower().strip(), p.get("visitante", "").lower().strip())
            extra = details_lookup.get(key, {})
            merged.append({
                "local": p.get("local", ""),
                "visitante": p.get("visitante", ""),
                "goles_local": p.get("goles_local"),
                "goles_visitante": p.get("goles_visitante"),
                "cod_acta": p.get("cod_acta"),
                "fecha": extra.get("fecha") or p.get("fecha", ""),
                "hora": extra.get("hora") or p.get("hora", ""),
                "campo": extra.get("campo") or p.get("campo", ""),
            })

        return merged

    def _extract_jornada_num(self, soup: BeautifulSoup) -> Optional[int]:
        """Extract current jornada number from JavaScript on clasificación page."""
        for script in soup.find_all("script"):
            text = script.string or ""
            match = re.search(r"CodJornada=(\d+)", text)
            if match:
                return int(match.group(1))
        return None

    # ========================================================================
    # Acta parsing
    # ========================================================================

    def _parse_acta(self, soup: BeautifulSoup, cod_acta: str) -> dict:
        """Parse a complete match report (acta).

        Structure (19 tables):
        - Table 0: Teams + Score (ntype in <h2>)
        - Table 4: Goals (minute, player, partial score)
        - Table 5: Info (stadium, city)
        - Table 6: Home starters (dorsal + name + card icon)
        - Table 7: Home subs
        - Tables 8-11: Home technical staff
        - Table 12: Home substitutions (minute + player)
        - Table 13: Away starters
        - Table 14: Away subs
        - Tables 15-17: Away technical staff
        - Table 18: Away substitutions
        """
        tables = soup.find_all("table")

        result = {
            "cod_acta": cod_acta,
            "local": {"nombre": "", "escudo_url": None},
            "visitante": {"nombre": "", "escudo_url": None},
            "goles_local": None,
            "goles_visitante": None,
            "estadio": "",
            "ciudad": "",
            "titulares_local": [],
            "suplentes_local": [],
            "titulares_visitante": [],
            "suplentes_visitante": [],
            "goles": [],
            "tarjetas_local": [],
            "tarjetas_visitante": [],
            "sustituciones_local": [],
            "sustituciones_visitante": [],
            "cuerpo_tecnico_local": {},
            "cuerpo_tecnico_visitante": {},
        }

        if len(tables) < 6:
            logger.warning("Acta %s has only %d tables, expected ~19", cod_acta, len(tables))
            return result

        # Header: team names, escudos, score
        self._parse_acta_header(soup, result)

        # Table 4: Goals
        if len(tables) > 4:
            result["goles"] = self._parse_acta_goles(tables[4])

        # Table 5: Stadium info
        if len(tables) > 5:
            info = self._parse_acta_info(tables[5])
            result["estadio"] = info.get("estadio", "")
            result["ciudad"] = info.get("ciudad", "")

        # Table 6: Home starters
        if len(tables) > 6:
            result["titulares_local"] = self._parse_acta_players(tables[6])

        # Table 7: Home subs
        if len(tables) > 7:
            result["suplentes_local"] = self._parse_acta_players(tables[7])

        # Tables 8-11: Home technical staff
        cuerpo_local = {}
        roles_local = ["delegado_campo", "delegado_equipo", "entrenador", "segundo_entrenador"]
        for i, role in enumerate(roles_local):
            idx = 8 + i
            if len(tables) > idx:
                name = self._parse_acta_staff(tables[idx])
                if name:
                    cuerpo_local[role] = name
        result["cuerpo_tecnico_local"] = cuerpo_local

        # Table 12: Home substitutions
        if len(tables) > 12:
            result["sustituciones_local"] = self._parse_acta_substitutions(tables[12])

        # Table 13: Away starters
        if len(tables) > 13:
            result["titulares_visitante"] = self._parse_acta_players(tables[13])

        # Table 14: Away subs
        if len(tables) > 14:
            result["suplentes_visitante"] = self._parse_acta_players(tables[14])

        # Tables 15-17: Away technical staff
        cuerpo_visitante = {}
        roles_visitante = ["delegado_campo", "delegado_equipo", "entrenador"]
        for i, role in enumerate(roles_visitante):
            idx = 15 + i
            if len(tables) > idx:
                name = self._parse_acta_staff(tables[idx])
                if name:
                    cuerpo_visitante[role] = name
        result["cuerpo_tecnico_visitante"] = cuerpo_visitante

        # Table 18: Away substitutions
        if len(tables) > 18:
            result["sustituciones_visitante"] = self._parse_acta_substitutions(tables[18])

        # Extract tarjetas from player lists (they contain card info)
        result["tarjetas_local"] = [
            {"jugador": p["nombre"], "tipo": p["tarjeta"]}
            for p in result["titulares_local"] + result["suplentes_local"]
            if p.get("tarjeta")
        ]
        result["tarjetas_visitante"] = [
            {"jugador": p["nombre"], "tipo": p["tarjeta"]}
            for p in result["titulares_visitante"] + result["suplentes_visitante"]
            if p.get("tarjeta")
        ]

        logger.info(
            "Parsed acta %s: %s %s-%s %s, %d goles, %d+%d local, %d+%d visitante",
            cod_acta,
            result["local"]["nombre"],
            result["goles_local"],
            result["goles_visitante"],
            result["visitante"]["nombre"],
            len(result["goles"]),
            len(result["titulares_local"]),
            len(result["suplentes_local"]),
            len(result["titulares_visitante"]),
            len(result["suplentes_visitante"]),
        )

        return result

    def _parse_acta_header(self, soup: BeautifulSoup, result: dict):
        """Parse acta header: team names, escudos, and score."""
        # Team names from h2 tags
        h2_tags = soup.find_all("h2")
        if len(h2_tags) >= 2:
            result["local"]["nombre"] = h2_tags[0].get_text(strip=True)
            result["visitante"]["nombre"] = h2_tags[-1].get_text(strip=True)

        # Escudos from club images
        escudo_imgs = soup.find_all("img", src=re.compile(r"/pnfg/pimg/Clubes/"))
        if len(escudo_imgs) >= 2:
            result["local"]["escudo_url"] = RFAF_BASE + escudo_imgs[0]["src"]
            result["visitante"]["escudo_url"] = RFAF_BASE + escudo_imgs[1]["src"]
        elif len(escudo_imgs) == 1:
            result["local"]["escudo_url"] = RFAF_BASE + escudo_imgs[0]["src"]

        # Score: try ntype decoding first
        score_decoded = self._decode_acta_score(soup)
        if score_decoded:
            result["goles_local"] = score_decoded[0]
            result["goles_visitante"] = score_decoded[1]
        else:
            # Fallback: plain text score
            for h2 in h2_tags:
                text = h2.get_text(strip=True)
                m = re.search(r"(\d+)\s*-\s*(\d+)", text)
                if m:
                    result["goles_local"] = int(m.group(1))
                    result["goles_visitante"] = int(m.group(2))
                    break

    def _decode_acta_score(self, soup: BeautifulSoup) -> Optional[tuple]:
        """Decode score from ntype JavaScript calls or fa-N CSS classes."""
        # Method 1: Parse ntype() calls from inline scripts
        all_scripts = "".join(s.string or "" for s in soup.find_all("script"))
        ntype_calls = re.findall(
            r'ntype\([^,]+,\s*(\d+),\s*(\d+),\s*["\']fa-(\d)["\']',
            all_scripts,
        )
        if len(ntype_calls) >= 2:
            digits = []
            for _n_str, _i_str, fa_digit in ntype_calls:
                # fa-N IS the real digit
                digits.append(int(fa_digit))
            if len(digits) >= 2:
                return (digits[0], digits[1])

        # Method 2: Parse visible fa-N elements in ntype spans
        ntype_spans = soup.find_all(
            "span", class_=lambda c: c and "ntype" in str(c)
        )
        if ntype_spans:
            all_digits = []
            for span in ntype_spans:
                visible_digits = []
                for elem in span.find_all(["i", "span"]):
                    style = (elem.get("style") or "").lower().replace(" ", "")
                    if "display:none" in style:
                        continue
                    for cls in elem.get("class", []):
                        m = re.match(r"fa-(\d)", cls)
                        if m:
                            visible_digits.append(int(m.group(1)))
                            break
                    else:
                        text = elem.get_text(strip=True)
                        if text.isdigit():
                            visible_digits.append(int(text))
                if visible_digits:
                    all_digits.append(int("".join(str(d) for d in visible_digits)))

            if len(all_digits) >= 2:
                return (all_digits[0], all_digits[1])

        return None

    def _parse_acta_goles(self, table) -> list[dict]:
        """Parse goals table: minute, player, partial score."""
        goles = []
        for row in table.find_all("tr"):
            cells = row.find_all("td")
            if len(cells) < 3:
                continue

            texts = [c.get_text(strip=True) for c in cells]

            minuto = None
            jugador = ""
            parcial_local = None
            parcial_visitante = None

            for text in texts:
                # Minute: "45" or "45'"
                m = re.match(r"(\d+)", text.replace("'", ""))
                if m and minuto is None and int(m.group(1)) <= 130:
                    minuto = int(m.group(1))
                    continue
                # Partial score: "1 - 0"
                pm = re.match(r"(\d+)\s*-\s*(\d+)", text)
                if pm:
                    parcial_local = int(pm.group(1))
                    parcial_visitante = int(pm.group(2))
                    continue
                # Player name
                if not text.isdigit() and len(text) > 2 and not jugador:
                    jugador = text

            if minuto is not None and jugador:
                goles.append({
                    "minuto": minuto,
                    "jugador": jugador,
                    "parcial_local": parcial_local,
                    "parcial_visitante": parcial_visitante,
                })

        return goles

    def _parse_acta_info(self, table) -> dict:
        """Parse match info table: stadium, city."""
        info = {}
        for row in table.find_all("tr"):
            cells = row.find_all("td")
            if len(cells) < 2:
                continue
            label = cells[0].get_text(strip=True).lower()
            value = cells[1].get_text(strip=True)

            if any(k in label for k in ("estadio", "campo", "instalación")):
                info["estadio"] = value
            elif any(k in label for k in ("ciudad", "localidad", "población")):
                info["ciudad"] = value

        return info

    def _parse_acta_players(self, table) -> list[dict]:
        """Parse players table (starters or subs): dorsal, name, card."""
        players = []
        for row in table.find_all("tr"):
            cells = row.find_all("td")
            if len(cells) < 2:
                continue

            texts = [c.get_text(strip=True) for c in cells]

            dorsal = None
            nombre = ""
            tarjeta = None

            for text in texts:
                if text.isdigit() and dorsal is None:
                    dorsal = int(text)
                elif text and not text.isdigit() and not nombre:
                    nombre = text

            # Card icons
            for img in row.find_all("img"):
                src = (img.get("src") or "").lower()
                if "tarj_amar" in src:
                    tarjeta = "amarilla"
                elif "tarj_roja" in src:
                    tarjeta = "roja"

            if nombre:
                players.append({
                    "dorsal": dorsal,
                    "nombre": nombre,
                    "tarjeta": tarjeta,
                })

        return players

    def _parse_acta_staff(self, table) -> Optional[str]:
        """Parse a technical staff table (single person)."""
        for row in table.find_all("tr"):
            for cell in row.find_all("td"):
                text = cell.get_text(strip=True)
                if text and not text.isdigit() and len(text) > 2:
                    return text
        return None

    def _parse_acta_substitutions(self, table) -> list[dict]:
        """Parse substitutions table: minute, player."""
        subs = []
        for row in table.find_all("tr"):
            cells = row.find_all("td")
            if len(cells) < 2:
                continue

            texts = [c.get_text(strip=True) for c in cells]
            minuto = None
            jugador = ""

            for text in texts:
                m = re.match(r"(\d+)", text.replace("'", ""))
                if m and minuto is None and int(m.group(1)) <= 130:
                    minuto = int(m.group(1))
                elif text and not text.isdigit() and len(text) > 2:
                    jugador = text

            if minuto is not None and jugador:
                subs.append({"minuto": minuto, "jugador": jugador})

        return subs
