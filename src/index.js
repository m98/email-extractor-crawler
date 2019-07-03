const domain = 'https://google.com/';

const Crawler = require("crawler");
const low = require('lowdb');
const FileAsync = require('lowdb/adapters/FileAsync');
const normalizeUrl = require('normalize-url');
const isURL = require('is-url');

const adapter = new FileAsync('email-extractor-crawler-db.json');
let db;
low(adapter).then((database) => {
    database.defaults({links: [], emails: []})
        .write().then();

    db = database;
});

let crawler = new Crawler({
    maxConnections: 10,
    rateLimit: 1000, // `maxConnections` will be forced to 1
    // This will be called for each crawled page
    callback: function (error, res, done) {
        if (error) {
            db.get('links')
                .find({link: normalizeUrl(res.request.uri.href)})
                .assign({crawled: true, errored: true})
                .write().then(() => {
                crawleNext();
            });
            console.log(error);
        } else {
            db.get('links')
                .find({link: normalizeUrl(res.request.uri.href)})
                .assign({crawled: true, errored: false})
                .write().then((link) => {
                let $ = res.$;
                // $ is Cheerio by default
                const emails = extractEmails($("body").text());
                StoreEmailsToDb(emails);

                let linksInPage = [];
                $("a").each(function (i, link) {
                    if (link.attribs.href) {
                        linksInPage.push(link.attribs.href);
                    }
                });
                StoreLinksToDb(linksInPage);
                crawleNext();

            });
        }

        done();
    }
});


function StoreEmailsToDb(emails) {
    if (emails && emails.length) {
        emails.map((email) => {
            db
                .get('emails')
                .find({email: email})
                .write().then((emailTable) => {
                if (!emailTable) {
                    console.log('New email found:', email);
                    db.get('emails')
                        .push({email: email})
                        .write().then()
                }
            });

        });


    }
}

let linkQ = [];

function StoreLinksToDb(links) {
    if (links && links.length) {
        linkQ = linkQ.concat(links);
        storeLink()
    }
}

function storeLink() {
    if (linkQ && linkQ.length) {
        let linkIsCorrect = false;
        let link = linkQ.shift();
        try {
            if (!link.includes('javaScript:void') && !link.includes('void(0)')) {

                if (link.indexOf(domain) !== 0 && !isURL(link)) {
                    link = domain + link;
                }
                linkIsCorrect = true;
                link = normalizeUrl(link);
            }
        } catch (e) {
            console.log('Error', e);
        }

        db.get('links')
            .find({link: link})
            .write().then((linkTable) => {
            if (!linkTable) {
                if (linkIsCorrect && link.indexOf(domain) === 0) {
                    // If the link is new
                    db.get('links')
                        .push({link: link, crawled: false})
                        .write().then(() => {
                    })
                }
            }

            storeLink()
        });
    }

}

function crawleNext() {
    setTimeout(() => {
        db.get('links')
            .find({crawled: false})
            .write().then((uncrawledLinks) => {
            if (uncrawledLinks && uncrawledLinks.link) {
                console.log('Crawling new link', uncrawledLinks.link);
                crawler.queue(uncrawledLinks.link);
            }
        });
    }, 1000)
}

function extractEmails(text) {
    return text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi);
}

// Queue just one URL, with default callback
crawler.queue(domain);