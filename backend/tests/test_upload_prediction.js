const fs = require('fs');
const http = require('http');

function uploadTestImage(imagePath, filename) {
  return new Promise((resolve, reject) => {
    const fileBuffer = fs.readFileSync(imagePath);
    const boundary = '----WebKitFormBoundary' + Math.random().toString(16).substring(2);

    const header = Buffer.from(
      '--' + boundary + '\r\nContent-Disposition: form-data; name=\"image\"; filename=\"' + filename + '\"\r\nContent-Type: image/jpeg\r\n\r\n'
    );
    const footer = Buffer.from('\r\n--' + boundary + '--\r\n');
    const postData = Buffer.concat([header, fileBuffer, footer]);

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 5000,
        path: '/api/predict',
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data; boundary=' + boundary,
          'Content-Length': postData.length
        }
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => (responseBody += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(responseBody);
            resolve({ statusCode: res.statusCode, data: parsed });
          } catch (err) {
            reject(new Error('Failed to parse JSON: ' + responseBody));
          }
        });
      }
    );

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function run() {
  console.log('Testing Image Upload for Amruta Balli...');
  const resAmruta = await uploadTestImage('dataset/cleaned/Amruta_Balli/144.jpg', '144.jpg');
  console.log('Amruta Balli Status:', resAmruta.statusCode);
  console.log('Amruta Balli Prediction:', {
    class: resAmruta.data.prediction?.class,
    localName: resAmruta.data.prediction?.localName,
    commonName: resAmruta.data.prediction?.commonName,
    scientificName: resAmruta.data.prediction?.scientificName,
    taxonomy: resAmruta.data.prediction?.taxonomy,
    medicinalPropertiesCount: resAmruta.data.medicinalProperties?.length
  });

  console.log('\nTesting Image Upload for Arali...');
  const resArali = await uploadTestImage('dataset/cleaned/Arali/352.jpg', '352.jpg');
  console.log('Arali Status:', resArali.statusCode);
  console.log('Arali Prediction:', {
    class: resArali.data.prediction?.class,
    localName: resArali.data.prediction?.localName,
    commonName: resArali.data.prediction?.commonName,
    scientificName: resArali.data.prediction?.scientificName,
    taxonomy: resArali.data.prediction?.taxonomy,
    medicinalPropertiesCount: resArali.data.medicinalProperties?.length
  });
}

run().catch(console.error);
