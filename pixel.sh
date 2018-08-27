cd ../../../../

# Install modules
echo "> npm install"
npm i

# Create build directory with compiled source
echo "> npm run build:production"
npm run build:production

# Copy CSS and index files to proper locations
scp ./source/js/plugins/Pixel.js/index.html ./
scp ./source/js/plugins/Pixel.js/pixel.css ./build

# Start server
python -m SimpleHTTPServer 9001
