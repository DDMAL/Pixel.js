# Pixel.js
```Pixel.js``` is a drawing and layering plugin that works on top of [```Diva.js```](https://github.com/DDMAL/diva.js). 

## Objectives
- Transform Diva from a document image viewer to a document editor and annotator.
- Label every pixel of the image with its corresponding class (background, staff lines, text, etc...). This will be used to provide the ground truth data for the machine learning algorithm that classifies and isolates the different components of old manuscripts and scores.

## Installation Instructions
- Download [```Diva v.6.0```](https://github.com/DDMAL/diva.js/tree/develop-diva6)
- Add ```Pixel.js``` directory into Diva's plugins folder.
- Include the path to pixel.js to the list of plugins in `webpack.config.js`.
``` js
plugins: (process.env.NODE_ENV === "production") ? productionPlugins() : developmentPlugins()
}, {
    entry: {
        'pixel': './source/js/plugins/Pixel.js/pixel.js',
        'download': './source/js/plugins/download.js',
        'manipulation': './source/js/plugins/manipulation.js'
    }
```
- include the pixel.js script in the body of your your main html file ```<script src="build/plugins/pixel.js"></script>```
- When instantiating diva, include pixel as a plugin. Your diva instantiation should like something like the following:
``` js
var diva = new Diva('diva-wrapper', {
                objectData: "https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json",
                plugins: [Diva.DownloadPlugin, Diva.ManipulationPlugin, Diva.PixelPlugin]
            });
```

## Example
``` html
<!doctype html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport"
          content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <link rel="stylesheet" href="build/css/diva.css" />
    <title>Document</title>
</head>
<body>
    <div id="diva-wrapper"></div>
    <script src="/assets/diva.js"></script>
    <script src="build/plugins/download.js"></script>
    <script src="build/plugins/manipulation.js"></script>
    <script src="build/plugins/pixel.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', function ()
        {
            var diva = new Diva('diva-wrapper', {
                objectData: "https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json",
                plugins: [Diva.DownloadPlugin, Diva.ManipulationPlugin, Diva.PixelPlugin]
            });
        }, false)
    </script>
</body>
</html>
```
- From the command line, run: `npm install` > `npm install -g gulp webpack` > `gulp`.
- Ensure that the build file created contains the `css` file. If not, add the `css` file from `source`.
- Diva and Pixel.js will be running on ```http://localhost:9001/```
