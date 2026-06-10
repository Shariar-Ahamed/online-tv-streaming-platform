const axios = require('axios');

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const streamUrl = req.query.url;
  if (!streamUrl) {
    return res.status(400).send('Missing url parameter');
  }

  try {
    const headers = {
      'User-Agent': 'Toffee (Linux;Android 14)',
    };

    const isM3u8 = streamUrl.includes('.m3u8');

    const response = await axios({
      method: 'GET',
      url: streamUrl,
      headers: headers,
      responseType: isM3u8 ? 'text' : 'stream'
    });

    if (isM3u8) {
      let playlist = response.data;
      const baseUrl = streamUrl.substring(0, streamUrl.lastIndexOf('/') + 1);

      const lines = playlist.split('\n');
      const newLines = lines.map(line => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
          const absoluteUrl = line.startsWith('http') ? line : baseUrl + line;
          return `https://${req.headers.host}/api/proxy?url=${encodeURIComponent(absoluteUrl)}`;
        }
        return line;
      });

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      return res.status(200).send(newLines.join('\n'));
    } else {
      res.setHeader('Content-Type', response.headers['content-type'] || 'video/mp2t');
      response.data.pipe(res);
    }
  } catch (error) {
    console.error('Error fetching stream:', error.message);
    res.status(500).send('Error fetching stream');
  }
};
