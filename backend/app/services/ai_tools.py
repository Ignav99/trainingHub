"""
TrainingHub Pro - AI Tool Schema Converter
Converts Claude tool definitions (input_schema) to Gemini FunctionDeclaration format.
"""

from google.genai import types

# Claude JSON type → Gemini Type enum
_TYPE_MAP = {
    "string": "STRING",
    "integer": "INTEGER",
    "number": "NUMBER",
    "boolean": "BOOLEAN",
    "array": "ARRAY",
    "object": "OBJECT",
}


def _convert_schema(schema: dict) -> dict:
    """Recursively convert a Claude JSON Schema to Gemini Schema dict.

    Gemini does not support `enum` on integer types, so we move those to the
    description field instead.
    """
    if not schema:
        return {}

    json_type = schema.get("type", "string")
    gemini_type = _TYPE_MAP.get(json_type, "STRING")

    result: dict = {"type": gemini_type}

    desc = schema.get("description", "")

    # Handle enum — Gemini only supports enum on STRING type
    if "enum" in schema:
        if json_type == "string":
            result["enum"] = schema["enum"]
        else:
            # Move integer/number enum to description
            desc = f"{desc} Allowed values: {schema['enum']}" if desc else f"Allowed values: {schema['enum']}"

    if desc:
        result["description"] = desc

    # Nested object properties
    if json_type == "object" and "properties" in schema:
        result["properties"] = {
            k: _convert_schema(v) for k, v in schema["properties"].items()
        }
        if "required" in schema:
            result["required"] = schema["required"]

    # Array items
    if json_type == "array" and "items" in schema:
        result["items"] = _convert_schema(schema["items"])

    return result


def claude_tools_to_gemini(claude_tools: list[dict]) -> list[types.FunctionDeclaration]:
    """Convert a list of Claude tool definitions to Gemini FunctionDeclarations.

    Claude tool format:
        {"name": "...", "description": "...", "input_schema": {type: "object", properties: {...}, required: [...]}}

    Gemini FunctionDeclaration format:
        FunctionDeclaration(name="...", description="...", parameters={type: "OBJECT", properties: {...}, required: [...]})
    """
    declarations = []
    for tool in claude_tools:
        params = _convert_schema(tool.get("input_schema", {}))
        declarations.append(types.FunctionDeclaration(
            name=tool["name"],
            description=tool.get("description", ""),
            parameters=params,
        ))
    return declarations
