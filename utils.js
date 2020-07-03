const { google } = require('googleapis');
const axios = require('axios')
const { parse } = require('node-html-parser');
const fs = require('fs');

function getData(auth, spreadsheetId, range) {
    const p = new Promise((res, rej) => {
        const sheets = google.sheets({version: 'v4', auth});
        sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
            }, (err, rawData) => {
                if (err) {
                    res('The API returned an error: ', err);
                } else {
                    const rows = rawData.data.values;
                    res(rows)
                }
            });
    })
    return p;
}

const getHtml = (url) => {
    const p = new Promise((res, rej) => {
        axios.get(url).then(raw => {
            res(raw.data)
        }).catch(e => {
            rej(e)
        })
    })
    return p;
}

const getWebsite = (html) => {
    const root = parse(html, {
        lowerCaseTagName: false,
        script: false,
        style: false,
        pre: false,
        comment: false
      });
    const li = root.querySelector('.single-contact-website');
    if (!li) return 'N/A'
    const anchor = li.querySelector('a')
    if (!anchor) return 'N/A'
    const link = anchor.rawText;
    return link || 'N/A';
}


const saveWebsites = async () => {
    const baseUrl = 'https://script.google.com/macros/s/AKfycbw4yw_5w65rAqT0RPj6BFDDMWZboS4DE9e88dR3_GK29zNBZW8d/exec?'
    const sites = JSON.parse(fs.readFileSync('websites.json'));
    console.log(sites);
    const numSites = sites.length;
    for (let i = 0; i < numSites; i++) {
        console.log(`${i} / ${numSites}`);
        const name = encodeURIComponent(sites[i].name);
        const website = encodeURIComponent(sites[i].website);
        const url = `${baseUrl}n=${name}&w=${website}`
        const res = await (axios.get(url));
        console.log(res.data);
    }
}

const pullBusinessSites = () => {
    authenticateGapiSession().then(token => {
        console.log('GAPI session authorized');
        getData(token, '1fOo7oZxCXDdeXNjIhPZquSJgMLjrNXbOSAcG6BVqM5w', 'OBW!A420:C4457').then(async (rows) => {
            const numRows = rows.length;
            for (let i = 0; i < rows.length; i++) {
                console.log(`... ${+i + 1} / ${numRows}`);
                let webSites = JSON.parse(fs.readFileSync('websites.json'));
                // the cell that contains the obw page for the business
                if (!rows[i][2]) {
                    webSites.push({name: rows[i][0], website: "N/A"});
                    continue;
                };
                let html;
                let webpageObj;
                let website = 'N/A'
                try {
                  html = await (getHtml(`https://www.${rows[i][2]}`));
                } catch(e) {
                    console.log('Error getting obw url');
                    webpageObj = { name: rows[i][0], website }
                    webSites.push(webpage)
                    fs.writeFileSync('websites.json', JSON.stringify(webSites))
                    continue;
                }
                website = getWebsite(html);
                webpageObj =  { name: rows[i][0], website }
                webSites.push(webpage)
                fs.writeFileSync('websites.json', JSON.stringify(webSites))
            }
        })
    }).catch(e => {
        console.log('Error authorizing GAPI session ', e);
    });
}

module.exports = {
      getData,
      getHtml,
      getWebsite,
      saveWebsites,
      pullBusinessSites
  }