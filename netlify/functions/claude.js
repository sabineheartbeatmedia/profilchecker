const https = require('https');

exports.handler = async function (event) {
  // CORS Vorab-Prüfung (OPTIONS)
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { prompt } = JSON.parse(event.body);

    // Hier bereiten wir die Daten für Anthropic vor
    const postData = JSON.stringify({
      model: "claude-3-5-sonnet-20241022", // Standard stabiler Modellname (ggf. anpassen falls nötig)
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    // Wir senden die Anfrage über das sichere Node.js-eigene HTTPS Modul (vermeidet den fetch-Fehler)
    const apiResponse = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            body: data
          });
        });
      });

      req.on('error', (e) => { reject(e); });
      req.write(postData);
      req.end();
    });

    const responseBody = JSON.parse(apiResponse.body);

    if (apiResponse.statusCode !== 200) {
      return {
        statusCode: apiResponse.statusCode,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: responseBody.error?.message || "Anthropic API Error" }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ content: responseBody.content }),
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
