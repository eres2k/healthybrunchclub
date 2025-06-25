backend:
  name: git-gateway
  branch: main

media_folder: "/images/uploads"
public_folder: "/images/uploads"

collections:
  - name: "menu-categories"
    label: "Menü Kategorien"
    folder: "content/menu"
    create: true
    slug: "{{slug}}"
    fields:
      - {label: "Kategorie Name", name: "title", widget: "string"}
      - {label: "Icon", name: "icon", widget: "string", required: false, hint: "Emoji für die Kategorie (z.B. 🍳)"}
      - {label: "Reihenfolge", name: "order", widget: "number", default: 1}
      - {label: "Kategorie Bild", name: "image", widget: "image", required: false}
      - label: "Menü Items"
        name: "items"
        widget: "list"
        fields:
          - {label: "Name", name: "name", widget: "string"}
          - {label: "Beschreibung", name: "description", widget: "text"}
          - {label: "Preis", name: "price", widget: "string", hint: "z.B. €12 oder €12-15"}
          - label: "Tags"
            name: "tags"
            widget: "list"
            hint: "z.B. vegan, glutenfrei, signature"
            field: {label: "Tag", name: "tag", widget: "string"}

  - name: "events"
    label: "Veranstaltungen"
    folder: "content/events"
    create: true
    slug: "{{year}}-{{month}}-{{day}}-{{slug}}"
    fields:
      - {label: "Event Titel", name: "title", widget: "string"}
      - {label: "Künstler/DJ", name: "artist", widget: "string"}
      - {label: "Datum", name: "date", widget: "datetime"}
      - {label: "Start Zeit", name: "startTime", widget: "string", default: "9:00 Uhr"}
      - {label: "Beschreibung", name: "description", widget: "text"}
      - {label: "Musik Stil", name: "musicStyle", widget: "string", required: false}
      - {label: "Bild", name: "image", widget: "image", required: false}
      - {label: "Audio Preview", name: "audioPreview", widget: "file", required: false}
      - {label: "Aktiv", name: "active", widget: "boolean", default: true}

  - name: "pages"
    label: "Seiten"
    files:
      - label: "Startseite"
        name: "home"
        file: "content/pages/home.yml"
        fields:
          - {label: "Titel", name: "title", widget: "string"}
          - {label: "Hero Titel", name: "heroTitle", widget: "string"}
          - {label: "Hero Beschreibung", name: "heroDescription", widget: "text"}
          - label: "Öffnungszeiten"
            name: "openingHours"
            widget: "object"
            fields:
              - {label: "Montag", name: "monday", widget: "string", default: "08:00 - 14:00 Uhr"}
              - {label: "Dienstag-Sonntag", name: "otherDays", widget: "string", default: "Geschlossen"}
          - label: "Kontakt"
            name: "contact"
            widget: "object"
            fields:
              - {label: "Adresse", name: "address", widget: "text"}
              - {label: "Telefon", name: "phone", widget: "string"}
              - {label: "Email", name: "email", widget: "string"}
