
window.jsonSchemas = window.jsonSchemas || {};
window.jsonSchemas['contact'] = {
  "type": "object",
  "default": { "name": null, "email": null, "phone": null },
  "required": ["name", "email"],
  "properties": {
    "name":  { "type": "string", "minLength": 2 },
    "email": { "type": "string", "default": null, "format": "email" },
    "phone": { "type": ["string","null"], "pattern": "^[0-9\-\.\s\(\)]+$" }
  }
}

