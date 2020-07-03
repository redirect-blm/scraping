const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

const authenticateGapiSession = () => {
    const p = new Promise((res, rej) => {
        readCredentials().then(credentials => {
            authorize(credentials).then(oAuth2Client => {
                res(oAuth2Client)
            }).catch(invalidToken => {
                getNewToken(invalidToken).then(newToken => {
                    res(newToken)
                }).catch(e => {
                    rej(e)
                })
            })
        }).catch(e => rej(e))
    })
    return p;
}

const readCredentials = () => {
    const p = new Promise((res, rej) => {
        // Load client secrets from a local file.
        fs.readFile('credentials.json', (err, content) => {
            if (err) {
                rej('Error loading client secret file:', err);
            } else {
              res(JSON.parse(content));
            }
        });
    })
    return p;
}


/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const p = new Promise((res, rej) => {
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) {
            rej(oAuth2Client) 
        }  else {
            oAuth2Client.setCredentials(JSON.parse(token))
            res(oAuth2Client)
        }
    });
  })
  return p;
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client) {
  const p = new Promise((res, rej) => {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
      });
      console.log('Authorize this app by visiting this url:', authUrl);
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
          if (err) return console.error('Error while trying to retrieve access token', err);
          oAuth2Client.setCredentials(token);
          // Store the token to disk for later program executions
          fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
            if (err) {
                rej(err)
            } else {
                console.log('Token stored to', TOKEN_PATH);
                res(oAuth2Client);
            }
          });
        });
      });
  })
  return p;
}

module.exports = {
    authenticateGapiSession
}