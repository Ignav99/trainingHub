"""Scraper extracts goal minutes even without a player name or with 45+2."""

from bs4 import BeautifulSoup

from app.services.rfef_scraper_service import RFAFScraper


def test_semantic_goles_minute_without_requiring_player():
    html = """
    <div class="dashboard-stat">
      <table>
        <tr>
          <td><span class="font-blue">(16')</span> GARCIA</td>
          <td>1 - 0</td>
        </tr>
        <tr>
          <td><span class="font-blue">(45+2')</span></td>
          <td>1 - 1</td>
        </tr>
      </table>
    </div>
    """
    section = BeautifulSoup(html, "html.parser")
    goles = RFAFScraper()._parse_acta_goles_semantic(section)
    assert [g["minuto"] for g in goles] == [16, 47]
    assert goles[0]["jugador"]
    assert goles[0]["parcial_local"] == 1
    assert goles[1]["parcial_visitante"] == 1


def test_semantic_goles_prefer_visible_fa_digits_over_decoy_text():
    html = """
    <div class="dashboard-stat">
      <table>
        <tr>
          <td><span class="font-blue">(8')</span> CASTILLEJO REDONDO, JOSE</td>
          <td>
            <span class="ntype"><i class="fa-4" style="display:none"></i><i class="fa-1"></i></span>
            -
            <span class="ntype"><i class="fa-9" style="display:none"></i><i class="fa-0"></i></span>
            4 - 1
          </td>
        </tr>
      </table>
    </div>
    """
    section = BeautifulSoup(html, "html.parser")
    goles = RFAFScraper()._parse_acta_goles_semantic(section)
    assert goles[0]["minuto"] == 8
    assert goles[0]["jugador"] == "CASTILLEJO REDONDO, JOSE"
    assert goles[0]["parcial_local"] == 1
    assert goles[0]["parcial_visitante"] == 0


def test_legacy_goles_quote_minute():
    html = """
    <table>
      <tr><td>20'</td><td>PEREZ</td><td>0 - 1</td></tr>
      <tr><td>88</td><td>LOPEZ</td><td>1 - 1</td></tr>
    </table>
    """
    table = BeautifulSoup(html, "html.parser").find("table")
    goles = RFAFScraper()._parse_acta_goles(table)
    assert [g["minuto"] for g in goles] == [20, 88]
    assert goles[0]["jugador"] == "PEREZ"
