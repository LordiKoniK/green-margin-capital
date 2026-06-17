# Green Margin Capital Website

Green Margin Capital was suffering from a severe website performance shortage, as the previous developer made them a site using WordPress containing thousands upon thousands of lines worth of redundant and unnecessary code, resulting in questionable page content and incredibly slow loading speeds. This is a new website made for the stockbroker, with more modern styling, efficient code usage to optimise load times and a much simpler codebase (with guiding comments) to allow for changes to easily be made by other developers further down the line if necessary. Developed by Njihia Muranga in conjunction with Green Margin Capital.

## Features

- Responsive design optimized for all device types and form factors
- Modern, clean UI with smooth animations
- Search Engine Optimization(SEO)-friendly structure
- Fast loading times with compression
- Security headers with Helmet.js
- Form validation and handling (CDSC registration and contact)
- Admin/Backend interface for form response management


## Tech Stack

- **Backend**: Node.js with Express
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Security**: Helmet.js
- **Performance**: Compression middleware

## Project Structure

```
green-margin-capital/
├── package.json          # General stuff
├── package-lock.json          
├── .gitignore            
├── README.md
|
├── server.js                    # Main server file (routes, security e.t.c.)
├── .env                         # Environment variables 
├── database.js                  # SQL functions
├── db_creation_schema.txt       # Run this (MySQL) code to recreate the database (useful for testing/backup purposes)
├── pdfFiller.js                 # Allows the admin to generate a filled version of the actual original CDSC form with all field data, passport photos and         |                                  signatures imported
|
└── public/               # Static files
    ├── html/
    │   └── .........,                    # General pages (Home, about, services, technology, downloads, news, contact)
    │   └── cdsc-application-form.html    # (Benefits of making CDSC account + actual form)
    │   └── admin.html              # Admin dashboard (manage CDSC applications, print them if necesasry)
    │   └── admin-messages.html     # Same thing but for messages from contact page form (minus printing)
    │   └── 404.html                # 404 error page
    |
    ├── css/
    │   └── styles.css           # Main stylesheet (for global styles e.g. general buttons, spacers, cards + colour variables)
    │   └── .........,           # Individual page stylesheets 
    │   └── market-ticker.css    # Stock market data feed on home page
    │   └── header-footer.css    # Consistent global header/footer styling since no React.js
    |
    ├── js/
    │   └── main.js                     # Home(Main) page Javascript
    │   └── admin.js                    # Admin page (CDSC applications) functionality
    │   └── admin-messages.js           # ^^ but contact form messages 
    │   └── cdsc-application-form.js    # Interactive form + submission, with autocomplete and signature drawing features
    │   └── contact.js                  # Contact handling
    │   └── market-ticker.js            # Home page stock market data feed, API key is kept in ENV for secutiry
    │   └── navigation.js               # Handle toggling nav menu type for mobile devices
    │   └── top-bar.js                  # Current date/time + Market status indicator
    │   └── services.js                 # Services page animations
    |
    ├── images/           # Image files used in the site
    |
    ├── documents/        # Downloadable documents on downloads page
    |
    ├── assets/           # Other assets
    |    └──CDS_1_1_INDIVIDUAL-JOINT_ACCOUNT_OPENING_FORM_1.pdf    # Original CDSC application form pdf that we fill
    |    └──KenyaBanks.json         # List of all banks (and all their branches) in Kenya, used for autofill feature in CDSC application page
    |
    └── favicon.ico    # Website icon (the little image you see on your browser tab)

```

## Installation

1. **Clone the repository**
    
2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   - `.env file not included in repository for security purposes
   - Download from file manager of live hosting server, or request from creator
   - Edit as needed

4. **Start the server (For local testing)**
   
   Development mode (with auto-restart):
   ```bash
   npm run dev
   ```
   
   Production mode:
   ```bash
   npm start
   ```

## Development

### Adding New Pages

1. Create HTML file in `public/` directory
2. Add route in `server.js`
3. Add navigation link in navbar of HTML files

### Customizing Styles

- Global styles and variables: `public/css/styles.css`
- Website color scheme is defined in CSS variables at the top of the file
- Responsive breakpoints have already been optimised, but can be adjusted further adjusted in media queries

### JavaScript Functionality

- Navigation: Adaptive mobile menu, scroll effects
- Carousel: Auto-play slider for highlight content
- Forms: Client-side validation, server-side handling
- Information: Stock market data, current date/time, dynamic market status updating
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

- All Chromium-based browsers (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance Optimizations

- Gzip compression enabled
- Minified assets
- Lazy loading and highly compressed images
- Efficient CSS with CSS variables
- Minimal JavaScript footprint

## Security Features

- Helmet.js for security headers
- Content Security Policy (CSP)
- CORS configuration
- Input validation
- XSS protection

## To-Do

- [ ] Add automatic email sending to support@greenmargincapital for contact form
- [✔] Implement CMS for news section
- [ ] Add analytics tracking
- [ ] Set up automated backups

## Support

For any questions or issues, kindly contact Njihia Muranga (+254725661142)

## License

Proprietary - Green Margin Capital
