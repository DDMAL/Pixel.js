# Pixel.js
```Pixel.js``` is a drawing and layering plugin that works on top of [```Diva.js```](https://github.com/DDMAL/diva.js). 

## Objectives
- Transform [```Diva.js```](https://github.com/DDMAL/diva.js) from a document image viewer to a document editor and annotator.
- Label every pixel of the image with its corresponding class (background, staff lines, text, etc...). This will be used to provide the ground truth data for the machine learning algorithm that classifies and isolates the different components of old manuscripts and scores.

## Quick Start
- Download [```Diva.js v.6.0```](https://github.com/DDMAL/diva.js/tree/develop-diva6) and [```Pixel.js```](https://github.com/DDMAL/Pixel.js/tree/develop).
- Place the entire ```Pixel.js``` folder into `diva.js/source/js/plugins`
- In `diva.js/webpack.config.js` you should find the list of plugins included in the Diva build like the following:

``` js
plugins: (process.env.NODE_ENV === "production") ? productionPlugins() : developmentPlugins()
}, {
    entry: {
        'download': './source/js/plugins/download.js',
        'manipulation': './source/js/plugins/manipulation.js'
    }
```
- Include the path to ```pixel.js``` file to the list of plugins your plugins entry should look like the following
```
entry: {
        'pixel': './source/js/plugins/Pixel.js/pixel.js',
        'download': './source/js/plugins/download.js',
        'manipulation': './source/js/plugins/manipulation.js'
    }
```

- In the ```Pixel.js``` directory, run the `pixel.sh` script using the following command.
```bash
$ ./pixel.sh
```
This will install the dependencies, build and run Diva with the pixel plugin instantiated. 
- By the end of the script, You might get a JSHint error. This is okay, Diva should be running on ```http://localhost:9001/``` 
- You can now start using Pixel by pressing on the pixel plugin icon on top of a page (black square)

## Alternative Start
### Instantiating Pixel.js
- include the pixel.js script in the `body` of your your main html file `diva.js/index.html` ```<script src="build/plugins/pixel.js"></script>```
- When instantiating diva, include `Diva.PixelPlugin` to the list of plugins. Your diva instantiation should like something like the following: (Take a look at the Example section for a full HTML example)
``` js
var diva = new Diva('diva-wrapper', {
                objectData: "https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json",
                plugins: [Diva.DownloadPlugin, Diva.ManipulationPlugin, Diva.PixelPlugin]
            });
```

### Running Diva.js
- Running diva requires [npm](https://www.npmjs.com/), [gulp](http://gulpjs.com/), and [webpack](https://webpack.github.io/). You can install these using [homebrew](https://brew.sh/) and running the following commands
```bash
$ brew install npm
$ brew install gulp
$ brew install webpack
```
- Now to run diva, run the following commands
```bash
$ npm install 
$ npm install -g gulp webpack
$ gulp
```
- copy `diva.css` from `diva.js/source/css/` to `build/css/` (if it is not already there)
- Diva and Pixel.js are now running on ```http://localhost:9001/``` and you can now start using Pixel by pressing on the pixel plugin icon on top of a page (black square)
