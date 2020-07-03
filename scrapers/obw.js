const { google } = require('googleapis');
const axios = require('axios')
const { parse } = require('node-html-parser');
const fs = require('fs');

// Get the data contained in a google sheet with the given sheet id and data range
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

// return the html content of a get request
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

// find the website listed on a businesses' official black wall street page
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

// send an object with data on a businesses' website to a Google Apps Script app that saves it in our spreadsheet
// Why not use Google Sheets API again? That might be a better approach here because it would keep all the code in
// this file, but I didn't want to add another authorization scope to the Google API authorization script, and I
// I already had a Google Apps script app set up to do this. I'm certainly opening to refactoring this if the need arrises.
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

// Iterate over the OBW pages in the given google sheet
// requests the html for businesses' actual website if listed on the page
// saves the website to websites.json
// Why not use a database to save the websites?
//  I didn't need any of the efficiency offered by a database for this so I didn't think it was worth the setup.
const pullBusinessSites = async (spreadsheetId, range) => {
    authenticateGapiSession().then(token => {
        console.log('GAPI session authorized');
        const rows = await getData(token, spreadsheetId, range);
        const numRows = rows.length;
        let webSites = JSON.parse(fs.readFileSync('websites.json'));
            for (let i = 0; i < numRows; i++) {
                console.log(`... ${+i + 1} / ${numRows}`);
                // the cell that contains the obw page for the business
                if (!rows[i][2]) {
                    webSites.push({name: rows[i][0], website: "N/A"});
                    continue;
                };
                let html, webpageObj;
                let website = 'N/A'
                try {
                  html = await (getHtml(`https://www.${rows[i][2]}`));
                } catch(e) {
                    console.log('Error getting obw url');
                    webpageObj = { name: rows[i][0], website }
                    webSites.push(webpage)
                    continue;
                }
                website = getWebsite(html);
                webpageObj =  { name: rows[i][0], website }
                webSites.push(webpage)
            }
            fs.writeFileSync('websites.json', JSON.stringify(webSites))
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