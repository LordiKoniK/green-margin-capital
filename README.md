# Green Margin Capital Website

A modern, professional website for Green Margin Capital - A Kenyan organic investment house.

## Features

- Responsive design optimized for all devices
- Modern, clean UI with smooth animations
- SEO-friendly structure
- Fast loading times with compression
- Security headers with Helmet.js
- Form validation and handling
- Interactive carousel/slider
- Scroll animations

## Tech Stack

- **Backend**: Node.js with Express
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Security**: Helmet.js
- **Performance**: Compression middleware

## Project Structure

```
green-margin-capital/
├── server.js              # Main server file
├── package.json           # Dependencies
├── .env                   # Environment variables
├── .gitignore            # Git ignore rules
├── README.md             # This file
└── public/               # Static files
    ├── index.html        # Home page
    ├── about.html        # About page
    ├── products.html     # Products page
    ├── downloads.html    # Downloads page
    ├── news.html         # News page
    ├── contact.html      # Contact page
    ├── 404.html          # 404 error page
    ├── css/
    │   └── styles.css    # Main stylesheet
    ├── js/
    │   └── main.js       # Main JavaScript
    ├── images/           # Image files
    └── assets/           # Other assets
```

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd green-margin-capital
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   - Edit `.env` file if needed
   - Default port is 3000

4. **Start the server**
   
   Development mode (with auto-restart):
   ```bash
   npm run dev
   ```
   
   Production mode:
   ```bash
   npm start
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

## Development

### Adding New Pages

1. Create HTML file in `public/` directory
2. Add route in `server.js`
3. Add navigation link in navbar (in HTML files)

### Customizing Styles

- Global styles and variables: `public/css/styles.css`
- Color scheme is defined in CSS variables at the top of the file
- Responsive breakpoints can be adjusted in media queries

### JavaScript Functionality

- Navigation: Mobile menu, scroll effects
- Carousel: Auto-play slider with navigation
- Forms: Client-side validation
- Animations: Scroll-triggered animations

## Deployment

### Prerequisites
- Node.js 14+ installed on server
- Port 3000 available (or configure different port)

### Steps
1. Upload files to server
2. Install dependencies: `npm install --production`
3. Set `NODE_ENV=production` in `.env`
4. Start with PM2 or similar process manager:
   ```bash
   pm2 start server.js --name green-margin
   ```

### Using PM2 (Recommended)
```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start server.js --name green-margin

# Make it start on boot
pm2 startup
pm2 save
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance Optimizations

- Gzip compression enabled
- Minified assets
- Lazy loading for images
- Efficient CSS with CSS variables
- Minimal JavaScript footprint

## Security Features

- Helmet.js for security headers
- Content Security Policy (CSP)
- CORS configuration
- Input validation
- XSS protection

## To-Do

- [ ] Add email sending functionality for contact form
- [ ] Implement CMS for news section
- [ ] Add analytics tracking
- [ ] Set up automated backups
- [ ] Add more product pages
- [ ] Implement user accounts (if needed)

## Support

For questions or issues, contact the development team.

## License

Proprietary - Green Margin Capital