#!/bin/bash
# Import retroactive reservations via the import-reservations function
# Usage: ./import-retroactive-reservations.sh [SITE_URL] [ADMIN_TOKEN]
#
# Example:
#   ./import-retroactive-reservations.sh https://healthybrunchclub.netlify.app your-admin-token

SITE_URL="${1:-https://healthybrunchclub.netlify.app}"
ADMIN_TOKEN="${2:-$ADMIN_TOKEN}"

if [ -z "$ADMIN_TOKEN" ]; then
  echo "Error: ADMIN_TOKEN is required (pass as second argument or set env var)"
  exit 1
fi

echo "Importing reservations to $SITE_URL..."

curl -X POST "${SITE_URL}/.netlify/functions/import-reservations" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d '{
  "reservations": [
    {
      "name": "Evamarie Pimentel-Klimpfinger",
      "email": "e_marie83@yahoo.com",
      "phone": "004369919583773",
      "date": "2026-01-31",
      "time": "12:30",
      "guests": 5,
      "specialRequests": ""
    },
    {
      "name": "Andrea Branc",
      "email": "andrea.branc@chello.at",
      "phone": "",
      "date": "2026-01-31",
      "time": "10:30",
      "guests": 3,
      "specialRequests": ""
    },
    {
      "name": "Annabel",
      "email": "a.lingaohernandez@gmail.com",
      "phone": "",
      "date": "2026-02-01",
      "time": "12:00",
      "guests": 2,
      "specialRequests": ""
    },
    {
      "name": "Jeannette Diaz",
      "email": "jjeannette0211@gmail.com",
      "phone": "",
      "date": "2026-02-01",
      "time": "12:00",
      "guests": 5,
      "specialRequests": "Die 5. Person ist ein Baby, daher benötigen wir bitte ein Kindersitz. Vielleicht können wir in der Nähe von der Familie Peñaranda sitzen. Wir freuen uns."
    },
    {
      "name": "Nicko",
      "email": "denise.tidoso@gmail.com",
      "phone": "+436603714777",
      "date": "2026-02-01",
      "time": "12:00",
      "guests": 2,
      "specialRequests": ""
    },
    {
      "name": "Jan Paul Gines",
      "email": "juanpablogines@gmail.com",
      "phone": "+436801460376",
      "date": "2026-01-29",
      "time": "08:00",
      "guests": 2,
      "specialRequests": ""
    },
    {
      "name": "Kimberly lapuz",
      "email": "ogkakisomi@gmail.com",
      "phone": "069918145646",
      "date": "2026-02-01",
      "time": "10:00",
      "guests": 2,
      "specialRequests": ""
    },
    {
      "name": "Tina",
      "email": "cjc.balisi@gmail.com",
      "phone": "69911141969",
      "date": "2026-01-29",
      "time": "08:30",
      "guests": 8,
      "specialRequests": "Test"
    },
    {
      "name": "Jacqueline Klincewicz",
      "email": "jacqueline.klincewicz@yahoo.com",
      "phone": "6506019201",
      "date": "2025-11-23",
      "time": "10:30",
      "guests": 2,
      "specialRequests": ""
    }
  ]
}'

echo ""
echo "Done!"
