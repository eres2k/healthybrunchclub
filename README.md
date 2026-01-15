# Healthy Brunch Club Wien

A premium restaurant website for Healthy Brunch Club, featuring healthy, gut-friendly, and anti-inflammatory dishes in Vienna, Austria.

## About

Healthy Brunch Club is a brunch restaurant founded by three sisters united by their love for travel, family, and brunching. The menu features trendy, balanced, and internationally inspired brunch dishes with a focus on healthy alternatives and anti-inflammatory ingredients.

**Location:** Neubaugasse 15, 1070 Wien, Austria

**Website:** https://healthybrunchclub.at

## Features

- Online menu with dietary filters (vegan, vegetarian, gluten-free, etc.)
- PDF menu downloads (German, English, Kids)
- Table reservation system
- Newsletter subscription
- Event announcements
- Mobile-responsive design
- CMS integration via Netlify

## Tech Stack

- HTML5 / CSS3
- Vanilla JavaScript
- Netlify CMS for content management
- Netlify Functions for reservations
- PDF menu management system

## PDF Menu Management

### Upload Process

1. **Via CMS Admin** (`/admin`):
   - Go to "Speisekarten PDF"
   - Upload new PDF file
   - File is automatically saved as `menu.pdf`
   - Old version is backed up

2. **QR Code URLs**:
   - Production: `https://healthybrunchclub.at/content/menu.pdf`
   - All redirects point to this fixed URL

## Author

**Erwin Esener**

Website development and maintenance.

## License

All rights reserved. Healthy Brunch Club Wien.
