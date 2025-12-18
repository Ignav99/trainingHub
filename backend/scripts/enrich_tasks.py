#!/usr/bin/env python3
"""
TrainingHub Pro - Script de Enriquecimiento de Tareas con IA
Usa Claude API para generar campos profesionales para todas las tareas.
"""

import os
import sys
import json
import time
from typing import Optional
from dotenv import load_dotenv

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from supabase import create_client, Client
import anthropic

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))

# Configuration
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')

# Batch size for processing
BATCH_SIZE = 5
DELAY_BETWEEN_BATCHES = 2  # seconds


def get_supabase_client() -> Client:
    """Create Supabase client."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def get_anthropic_client() -> anthropic.Anthropic:
    """Create Anthropic client."""
    if not ANTHROPIC_API_KEY:
        raise ValueError("Missing ANTHROPIC_API_KEY")
    return anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)


ENRICHMENT_PROMPT = """Eres un experto metodólogo de fútbol profesional. Analiza esta tarea de entrenamiento y genera los campos faltantes.

TAREA:
- Título: {titulo}
- Código: {codigo}
- Categoría: {categoria}
- Descripción: {descripcion}
- Fase de juego: {fase_juego}
- Principio táctico: {principio_tactico}
- Estructura: {estructura_equipos}
- Espacio: {espacio_largo}x{espacio_ancho}m ({espacio_forma})
- Jugadores: {num_jugadores_min}-{num_jugadores_max}
- Tipo esfuerzo: {tipo_esfuerzo}
- Densidad: {densidad}
- Nivel cognitivo: {nivel_cognitivo}

Genera estos campos en formato JSON (sin explicaciones adicionales, solo el JSON):

{{
  "objetivo_fisico": "descripción del objetivo físico principal (resistencia, velocidad, fuerza, etc.)",
  "objetivo_psicologico": "descripción del objetivo mental/psicológico (concentración, comunicación, etc.)",
  "reglas_tecnicas": ["regla técnica 1", "regla técnica 2", "regla técnica 3"],
  "reglas_tacticas": ["regla táctica 1", "regla táctica 2"],
  "reglas_psicologicas": ["regla motivacional/psicológica 1"],
  "consignas_ofensivas": ["consigna ofensiva 1", "consigna ofensiva 2", "consigna ofensiva 3"],
  "consignas_defensivas": ["consigna defensiva 1", "consigna defensiva 2"],
  "errores_comunes": ["error común 1", "error común 2", "error común 3"],
  "variantes": [
    {{"nombre": "Variante 1", "descripcion": "descripción breve", "dificultad": "+1 o -1"}},
    {{"nombre": "Variante 2", "descripcion": "descripción breve", "dificultad": "+1 o -1"}}
  ],
  "progresiones": ["progresión 1 para aumentar dificultad", "progresión 2"],
  "regresiones": ["regresión 1 para simplificar", "regresión 2"],
  "material": ["material necesario 1", "material 2", "material 3"],
  "como_inicia": "descripción de cómo inicia la tarea",
  "como_finaliza": "descripción de cuándo/cómo finaliza"
}}

IMPORTANTE:
- Sé específico para el tipo de ejercicio (rondo, posesión, partido, etc.)
- Las consignas deben ser claras y aplicables
- El material debe ser realista (conos, petos, balones, porterías, etc.)
- Las variantes deben ser prácticas y coherentes con el ejercicio
- Responde SOLO con el JSON, sin texto adicional"""


def enrich_task(client: anthropic.Anthropic, task: dict) -> Optional[dict]:
    """Use Claude to generate enrichment data for a task."""

    # Get category name
    categoria_name = "Desconocida"
    if task.get('categorias_tarea'):
        categoria_name = task['categorias_tarea'].get('nombre', 'Desconocida')

    prompt = ENRICHMENT_PROMPT.format(
        titulo=task.get('titulo', ''),
        codigo=task.get('codigo', ''),
        categoria=categoria_name,
        descripcion=task.get('descripcion', ''),
        fase_juego=task.get('fase_juego', ''),
        principio_tactico=task.get('principio_tactico', ''),
        estructura_equipos=task.get('estructura_equipos', ''),
        espacio_largo=task.get('espacio_largo', 0),
        espacio_ancho=task.get('espacio_ancho', 0),
        espacio_forma=task.get('espacio_forma', ''),
        num_jugadores_min=task.get('num_jugadores_min', 0),
        num_jugadores_max=task.get('num_jugadores_max', 0),
        tipo_esfuerzo=task.get('tipo_esfuerzo', ''),
        densidad=task.get('densidad', ''),
        nivel_cognitivo=task.get('nivel_cognitivo', 1)
    )

    try:
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2000,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        response_text = message.content[0].text.strip()

        # Clean up response - extract JSON if wrapped in markdown
        if response_text.startswith('```'):
            lines = response_text.split('\n')
            json_lines = []
            in_json = False
            for line in lines:
                if line.startswith('```json'):
                    in_json = True
                    continue
                elif line.startswith('```'):
                    in_json = False
                    continue
                if in_json:
                    json_lines.append(line)
            response_text = '\n'.join(json_lines)

        return json.loads(response_text)

    except json.JSONDecodeError as e:
        print(f"  ⚠️  Error parsing JSON for {task.get('codigo')}: {e}")
        return None
    except Exception as e:
        print(f"  ⚠️  Error enriching {task.get('codigo')}: {e}")
        return None


def update_task(supabase: Client, task_id: str, enrichment: dict) -> bool:
    """Update a task with enrichment data."""
    try:
        update_data = {
            'objetivo_fisico': enrichment.get('objetivo_fisico'),
            'objetivo_psicologico': enrichment.get('objetivo_psicologico'),
            'reglas_tecnicas': enrichment.get('reglas_tecnicas'),
            'reglas_tacticas': enrichment.get('reglas_tacticas'),
            'reglas_psicologicas': enrichment.get('reglas_psicologicas'),
            'consignas_ofensivas': enrichment.get('consignas_ofensivas'),
            'consignas_defensivas': enrichment.get('consignas_defensivas'),
            'errores_comunes': enrichment.get('errores_comunes'),
            'variantes': enrichment.get('variantes'),
            'progresiones': enrichment.get('progresiones'),
            'regresiones': enrichment.get('regresiones'),
            'material': enrichment.get('material'),
            'como_inicia': enrichment.get('como_inicia'),
            'como_finaliza': enrichment.get('como_finaliza'),
        }

        supabase.table('tareas').update(update_data).eq('id', task_id).execute()
        return True
    except Exception as e:
        print(f"  ⚠️  Error updating task {task_id}: {e}")
        return False


def main():
    """Main function to enrich all tasks."""
    print("=" * 60)
    print("🚀 TrainingHub Pro - Enriquecimiento de Tareas con IA")
    print("=" * 60)

    # Initialize clients
    print("\n📡 Conectando a servicios...")
    supabase = get_supabase_client()
    anthropic_client = get_anthropic_client()
    print("✅ Conexión establecida")

    # Fetch all tasks that need enrichment
    print("\n📥 Obteniendo tareas sin enriquecer...")
    response = supabase.table('tareas').select(
        '*, categorias_tarea(nombre, codigo)'
    ).is_('objetivo_fisico', 'null').execute()

    tasks = response.data
    total_tasks = len(tasks)

    if total_tasks == 0:
        print("✅ Todas las tareas ya están enriquecidas!")
        return

    print(f"📋 Encontradas {total_tasks} tareas para enriquecer")

    # Process in batches
    enriched = 0
    failed = 0

    for i in range(0, total_tasks, BATCH_SIZE):
        batch = tasks[i:i + BATCH_SIZE]
        batch_num = (i // BATCH_SIZE) + 1
        total_batches = (total_tasks + BATCH_SIZE - 1) // BATCH_SIZE

        print(f"\n📦 Procesando lote {batch_num}/{total_batches}...")

        for task in batch:
            codigo = task.get('codigo', 'N/A')
            titulo = task.get('titulo', 'Sin título')[:40]
            print(f"  🔄 {codigo}: {titulo}...")

            # Generate enrichment with AI
            enrichment = enrich_task(anthropic_client, task)

            if enrichment:
                # Update task in database
                if update_task(supabase, task['id'], enrichment):
                    print(f"  ✅ {codigo}: Enriquecido correctamente")
                    enriched += 1
                else:
                    failed += 1
            else:
                failed += 1

        # Delay between batches to avoid rate limits
        if i + BATCH_SIZE < total_tasks:
            print(f"  ⏳ Esperando {DELAY_BETWEEN_BATCHES}s antes del siguiente lote...")
            time.sleep(DELAY_BETWEEN_BATCHES)

    # Summary
    print("\n" + "=" * 60)
    print("📊 RESUMEN")
    print("=" * 60)
    print(f"✅ Tareas enriquecidas: {enriched}")
    print(f"❌ Tareas fallidas: {failed}")
    print(f"📋 Total procesadas: {enriched + failed}/{total_tasks}")
    print("=" * 60)


if __name__ == "__main__":
    main()
