# Pixel.js
```Pixel.js``` is a [```Diva.js```](https://github.com/DDMAL/diva.js) plugin.

## Instructions
How to install the plug-in into [```Diva.js```](https://github.com/DDMAL/diva.js).
- Download Diva v.6.0
- Add ```Pixel.js``` into Diva's plugins folder.
- Disable mouse drag scrolling in Diva: `diva` > `source` > `utils` > `viewer-core.js` > comment out ```this.viewerState.viewportObject.classList.add('dragscroll');```.
- From the command line, run: `npm install` > `npm install -g gulp webpack` > `gulp`.
- Ensure that the build file created contains the `css` file. If not, add the `css` file from `source`.
- Diva and Pixel.js will be running on ```http://localhost:9001/```
