
window.jsonSchemas = window.jsonSchemas || {};
window.jsonSchemas['contact'] = {
  "type": "object",
  "required": ["name","email"],
  "properties": {
    "name":  { "minLength": 2 },
    "email": { "format": "email" },
    "phone": { "pattern": "^[0-9\-\.\s\(\)]+$" }
  }
}

