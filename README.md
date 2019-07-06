# email-extractor-crawler
A minimal Node crawler to find emails used inside a website content, this crawler follows links in the website and tries to find an email in the content of the page. You just need to pass a domain name and wait until the crawler search to find email in pages.

You can find list of extracted emails in  `email-extractor-crawler-db.json` in the root directory.

## How to use?
Update the first line of `src/index.js` (domain) to your preferred domain name (the full path of domain is necessary, ex: `https://google.com/`). Then just in terminal run `node src/index.js`
