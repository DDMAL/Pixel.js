# Pixel.js
```Pixel.js``` is a drawing and layering plugin that works on top of [```Diva.js```](https://github.com/DDMAL/diva.js). 

## Objectives
- Transform [```Diva.js```](https://github.com/DDMAL/diva.js) from a document image viewer to a document editor and annotator.
- Label every pixel of the image with its corresponding class (background, staff lines, text, etc...). This will be used to provide the ground truth data for the machine learning algorithm that classifies and isolates the different components of old manuscripts and scores.

## Prerequisites
The following is a list of prerequisites that are necessary to run [```Diva.js```](https://github.com/DDMAL/diva.js) (and thus Pixel.js).
- [Node.js](https://github.com/nodesource/distributions#debinstall) v8.0.0 or higher
- [npm](https://www.npmjs.com/get-npm) v5.0.0 or higher
- [webpack](https://webpack.js.org/guides/installation/) v3.0.0 or higher

- Download [```Diva.js v.6.0```](https://github.com/DDMAL/diva.js/tree/develop) and [```Pixel.js```](https://github.com/DDMAL/Pixel.js/tree/develop). Be aware that Pixel.js will only work with Diva.js v6.0, so please ensure that is the version used before proceeding.
- If necessary, rename the pixel folder to ```Pixel.js``` and place the entire folder into `diva.js/source/js/plugins`
- In `diva.js/webpack.config.js` you should find the list of plugins included in the Diva build like the following:
    ``` js
    entry: {
        'download': './source/js/plugins/download.js',
        'manipulation': './source/js/plugins/manipulation.js',
        'metadata': './source/js/plugins/metadata.js'
    }
    ```
- Include the path to ```pixel.js``` file to the list of plugins your plugins entry should look like the following
    ``` js
    entry: {
        'download': './source/js/plugins/download.js',
        'metadata': './source/js/plugins/metadata.js',
        'manipulation': './source/js/plugins/manipulation.js',
        'pixel': './source/js/plugins/Pixel.js/source/pixel.js'
    }   
    ```

## Quick Start
- After the prerequisite steps are completed, you should be in the `diva.js/` directory.
- Install [Node.js](https://nodejs.org/en/download/).
- Navigate to `source/js/plugins/Pixel.js/`, and run `./pixel.sh`. 
- Diva and Pixel should now be running at `http://localhost:9001`.  

## Alternative Start
### Instantiating Pixel.js
- Include the pixel.js script in the `body` of your your main html file `diva.js/index.html` like so:
    ```html
    <script src="build/plugins/pixel.js"></script>
    ```
- When instantiating diva, include `Diva.PixelPlugin` to the list of plugins. Your diva instantiation should like something like the following: (Take a look at the Example section for a full HTML example)
    ```javascript
    var diva = new Diva('diva-wrapper', {
        objectData: "https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json",
        plugins: [Diva.DownloadPlugin, Diva.ManipulationPlugin, Diva.MetadataPlugin, Diva.PixelPlugin]
    });
    ```

### Running Diva.js
- To run diva, make sure that all the prerequisites are met then run the following commands (from the root directory)
    ```bash
    $ npm install 
    $ npm run build:production
    $ cp ./source/js/plugins/Pixel.js/pixel.css ./build
    $ python -m SimpleHTTPServer 9001
    ```
- Diva and Pixel.js are now running on ```http://localhost:9001/``` and you can now start using Pixel by pressing on the pixel plugin icon on top of a page (black square)
