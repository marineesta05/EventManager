const { google } = require('googleapis');
const dotenv = require('dotenv');
dotenv.config({ path: '../.env' });

// Google Calendar API configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URL = process.env.GOOGLE_REDIRECT_URL || 'http://localhost:3000/auth/google/callback';

// Create OAuth2 client
const oAuth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  REDIRECT_URL
);

// Function to generate authorization URL
function getAuthUrl() {
  const scopes = ['https://www.googleapis.com/auth/calendar.events'];
  return oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent'
  });
}

// Function to exchange authorization code for tokens
async function getTokensFromCode(code) {
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    return tokens;
  } catch (error) {
    console.error('Error getting tokens:', error);
    throw error;
  }
}

// Function to add event to user's Google Calendar
async function addEventToCalendar(accessToken, eventDetails) {
  try {
    // Set credentials
    oAuth2Client.setCredentials({ access_token: accessToken });
    
    // Create calendar instance
    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
    
    // Format the event
    const event = {
      summary: eventDetails.title,
      location: eventDetails.location,
      description: `Réservation confirmée pour ${eventDetails.title}. Places: ${eventDetails.seats.join(', ')}`,
      start: {
        dateTime: eventDetails.datetime,
        timeZone: 'Europe/Paris',
      },
      end: {
        // Adding 2 hours to end time as default duration
        dateTime: new Date(new Date(eventDetails.datetime).getTime() + 2 * 60 * 60 * 1000).toISOString(),
        timeZone: 'Europe/Paris',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 day before
          { method: 'popup', minutes: 60 } // 1 hour before
        ],
      },
    };
    
    // Insert the event
    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });
    
    return response.data;
  } catch (error) {
    console.error('Error adding event to calendar:', error);
    throw error;
  }
}

// Function to store user tokens in database (you need to implement this with your database)
async function storeUserTokens(userId, tokens, sql) {
  try {
    // Check if user already has tokens
    const existingTokens = await sql`
      SELECT * FROM user_calendar_tokens WHERE user_id = ${userId}
    `;

    if (existingTokens.length > 0) {
      // Update tokens
      await sql`
        UPDATE user_calendar_tokens 
        SET access_token = ${tokens.access_token}, 
            refresh_token = ${tokens.refresh_token || existingTokens[0].refresh_token},
            expiry_date = ${tokens.expiry_date}
        WHERE user_id = ${userId}
      `;
    } else {
      // Insert new tokens
      await sql`
        INSERT INTO user_calendar_tokens (user_id, access_token, refresh_token, expiry_date)
        VALUES (${userId}, ${tokens.access_token}, ${tokens.refresh_token}, ${tokens.expiry_date})
      `;
    }
    return true;
  } catch (error) {
    console.error('Error storing user tokens:', error);
    throw error;
  }
}

// Function to get user tokens from database
async function getUserTokens(userId, sql) {
  try {
    const tokens = await sql`
      SELECT access_token, refresh_token, expiry_date 
      FROM user_calendar_tokens 
      WHERE user_id = ${userId}
    `;
    
    if (tokens.length === 0) {
      return null;
    }
    
    return tokens[0];
  } catch (error) {
    console.error('Error getting user tokens:', error);
    throw error;
  }
}

async function refreshAccessToken(userId, tokens, sql) {
  try {
    oAuth2Client.setCredentials({
      refresh_token: tokens.refresh_token
    });
    
    const { credentials } = await oAuth2Client.refreshAccessToken();
    
    
    await sql`
      UPDATE user_calendar_tokens 
      SET access_token = ${credentials.access_token},
          expiry_date = ${credentials.expiry_date}
      WHERE user_id = ${userId}
    `;
    
    return credentials;
  } catch (error) {
    console.error('Error refreshing access token:', error);
    throw error;
  }
}

module.exports = {
  getAuthUrl,
  getTokensFromCode,
  addEventToCalendar,
  storeUserTokens,
  getUserTokens,
  refreshAccessToken
};