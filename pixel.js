/**
 * This plugin will be used to transform Diva into a layering tool which will be used to provide
 * the ground truth data for the machine learning algorithm
 * that classifies and isolates the different components of old manuscripts and scores.
 *
 * {string} pluginName - Added to the class prototype. Defines the name for the plugin.
 *
 *
 **/
export default class PixelPlugin
{
    constructor (core)
    {
        this.core = core;
        this.activated = false;
        this.pageToolsIcon = this.createIcon();
        this.handle = null;
        this.layers = null;
        this.matrix = null;
        this.mousePressed = false;
        this.lastX, this.lastY;
    }

    // Subscribes to VisibleTilesDidLoad event to start drawing highlights.
    // Takes an array of highlighted objects
    activatePlugin()
    {
        this.core.disableScrollable();
        
        if(this.layers === null){
            // Create the array of highlights to pass to drawHighlights function
            let highlight1 = new HighlightArea(23, 42, 24, 24, 0);
            // highlight2 = new HighlightArea(48, 50, 57, 5, 0),
            // highlight3 = new HighlightArea(75, 80, 30, 10, 0),
            // highlight4 = new HighlightArea(21, 77, 12, 13.5, 0),
            // highlight5 = new HighlightArea(50, 120, 50, 10, 0),
            // highlight6 = new HighlightArea(30, 180, 60, 20, 0);
            let highlighted1 = [highlight1];
            // highlighted2 = [highlight3, highlight4],
            // highlighted3 = [highlight5, highlight6];
            let layer1 = new Layer(0,0.3, highlighted1);
            // layer2 = new Layer(1,0.5, highlighted2),
            // layer3 = new Layer(2,0.3, highlighted3);
            this.layers = [layer1];
        }

        let handle = this.subscribeToEvent();
        this.core.getSettings().renderer._paint();  // Repaint the tiles to retrigger VisibleTilesDidLoad
        this.activated = true;
        this.layers.forEach((layer) => {
            this.createPluginElements(layer);
        });

        var canvas = document.getElementById("diva-1-outer");

        canvas.addEventListener('mousedown', (evt) =>
        {
            this.mousePressed = true;
            let pageIndex = this.core.getSettings().currentPageIndex;
            let zoomLevel = this.core.getSettings().zoomLevel;

            var mousePos = this.getMousePos(canvas, evt);
            var relativeCoords = this.getRelativeCoordinates(mousePos.x, mousePos.y);
            let point = new Point(relativeCoords.x, relativeCoords.y, pageIndex);
            this.layers[0].createNewPath(point);


            // var mousePos = this.getMousePos(canvas, evt);
            // var relativeCoords = this.getRelativeCoordinates(mousePos.x, mousePos.y);
            //let highlight = new HighlightArea(relativeCoords.x, relativeCoords.y, 1, 1, pageIndex);
            // this.layers[0].addAreaToLayer(highlight);
            //this.drawHighlight(this.layers[0], highlight, pageIndex, zoomLevel);
            this.drawPath(this.layers[0], point, pageIndex, zoomLevel, false);
        });

        canvas.addEventListener('mouseup', (evt) =>
        {
            this.mousePressed = false;
        });

        canvas.addEventListener('mouseleave', (evt) =>
        {
            this.mousePressed = false;
        });

        canvas.addEventListener('mousemove', (evt) =>
        {
            if (this.mousePressed)
            {
                this.mousePressed = true;
                let pageIndex = this.core.getSettings().currentPageIndex;
                let zoomLevel = this.core.getSettings().zoomLevel;

                var mousePos = this.getMousePos(canvas, evt);
                var relativeCoords = this.getRelativeCoordinates(mousePos.x, mousePos.y);
                let point = new Point(relativeCoords.x, relativeCoords.y, pageIndex);
                this.layers[0].addToLastPath(point);

                // let pageIndex = this.core.getSettings().currentPageIndex;
                // let zoomLevel = this.core.getSettings().zoomLevel;
                //
                // var mousePos = this.getMousePos(canvas, evt);
                // var relativeCoords = this.getRelativeCoordinates(mousePos.x, mousePos.y);
                // let highlight = new HighlightArea(relativeCoords.x, relativeCoords.y, 1, 1, pageIndex);
                // this.layers[0].addAreaToLayer(highlight);
                //this.drawHighlight(this.layers[0], highlight, pageIndex, zoomLevel);
                this.drawPath(this.layers[0], point, pageIndex, zoomLevel, true);
            }
        }, false);

        return handle;
    }


    deactivatePlugin()
    {
        Diva.Events.unsubscribe(this.handle);
        this.core.getSettings().renderer._paint(); // Repaint the tiles to make the highlights disappear off the page
        this.activated = false;
        this.layers.forEach((layer) => {
            this.destroyPluginElements(layer);
        });
    }

    createPluginElements(layer)
    {
        var x = document.createElement("input");
        x.setAttribute("id", "layer " + layer.layerType);
        x.setAttribute("type", "range");
        x.setAttribute('max', 100);
        x.setAttribute('min', 0);
        x.setAttribute('value', layer.opacity*100);
        document.body.appendChild(x);

        var rangeInput = document.getElementById("layer " + layer.layerType);

        rangeInput.addEventListener("input", () =>
        {
            layer.opacity = rangeInput.value/100;
            this.core.getSettings().renderer._paint();
        });
    }

    destroyPluginElements(layer){
        var rangeInput = document.getElementById("layer " + layer.layerType);
        document.body.removeChild(rangeInput);
    }

    subscribeToEvent(){
        let handle = Diva.Events.subscribe('VisibleTilesDidLoad', (args) =>
        {
            this.drawHighlights(args);
        });
        return handle;
    }

    getMousePos(canvas, evt) {
        var rect = canvas.getBoundingClientRect();
        return {
            x: evt.clientX - rect.left,
            y: evt.clientY - rect.top
        };
    }

    getRelativeCoordinates(highlightXOffset, highlightYOffset)
    {
        let pageIndex = this.core.getSettings().currentPageIndex;
        let zoomLevel = this.core.getSettings().zoomLevel;

        let renderer = this.core.getSettings().renderer;
        let scaleRatio = Math.pow(2,zoomLevel);

        const viewportPaddingX = Math.max(0, (renderer._viewport.width - renderer.layout.dimensions.width) / 2);
        const viewportPaddingY = Math.max(0, (renderer._viewport.height - renderer.layout.dimensions.height) / 2);

        // Calculates where the highlights should be drawn as a function of the whole webpage coordinates
        // (to make it look like it is on top of a page in Diva)
        let absoluteRectOriginX = highlightXOffset - renderer._getImageOffset(pageIndex).left + renderer._viewport.left -  viewportPaddingX;
        let absoluteRectOriginY = highlightYOffset - renderer._getImageOffset(pageIndex).top + renderer._viewport.top - viewportPaddingY;

        return {
            x: absoluteRectOriginX/scaleRatio,
            y: absoluteRectOriginY/scaleRatio
        };
    }

    drawHighlight(layer, highlighted, pageIndex, zoomLevel)
    {
        let opacity = layer.opacity;
        let renderer = this.core.getSettings().renderer;
        let scaleRatio = Math.pow(2,zoomLevel);

        const viewportPaddingX = Math.max(0, (renderer._viewport.width - renderer.layout.dimensions.width) / 2);
        const viewportPaddingY = Math.max(0, (renderer._viewport.height - renderer.layout.dimensions.height) / 2);

        // The following absolute values are experimental values to highlight the square on the first page of Salzinnes, CDN-Hsmu M2149.L4
        // The relative values are used to scale the highlights according to the zoom level on the page itself
        let absoluteRectOriginX = highlighted.relativeRectOriginX * scaleRatio;
        let absoluteRectOriginY = highlighted.relativeRectOriginY * scaleRatio;
        let absoluteRectWidth = highlighted.relativeRectWidth * scaleRatio;
        let absoluteRectHeight = highlighted.relativeRectHeight * scaleRatio;

        // This indicates the page on top of which the highlights are supposed to be drawn
        let highlightPageIndex = highlighted.pageIndex;

        if (pageIndex === highlightPageIndex)
        {
            // Calculates where the highlights should be drawn as a function of the whole webpage coordinates
            // (to make it look like it is on top of a page in Diva)
            let highlightXOffset = renderer._getImageOffset(pageIndex).left - renderer._viewport.left + viewportPaddingX + absoluteRectOriginX;
            let highlightYOffset = renderer._getImageOffset(pageIndex).top - renderer._viewport.top + viewportPaddingY + absoluteRectOriginY;

            //Draw the rectangle
            let rgba = null;
            switch (layer.layerType)
            {
                case 0:
                    rgba = "rgba(51, 102, 255, " + opacity + ")";
                    break;
                case 1:
                    rgba = "rgba(255, 51, 102, " + opacity + ")";
                    break;
                case 2:
                    rgba = "rgba(255, 255, 10 , " + opacity + ")";
                    break;
                case 3:
                    rgba = "rgba(10, 255, 10, " + opacity + ")";
                    break;
                case 4:
                    rgba = "rgba(120, 0, 120, " + opacity + ")";
                    break;
                default:
                    rgba = "rgba(255, 0, 0, " + opacity + ")";
            }

            renderer._ctx.fillStyle = rgba;
            renderer._ctx.fillRect(highlightXOffset, highlightYOffset,absoluteRectWidth,absoluteRectHeight);
        }
    }

    drawPath(layer, point, pageIndex, zoomLevel, isDown)
    {
        let opacity = layer.opacity;
        let renderer = this.core.getSettings().renderer;
        let scaleRatio = Math.pow(2,zoomLevel);

        const viewportPaddingX = Math.max(0, (renderer._viewport.width - renderer.layout.dimensions.width) / 2);
        const viewportPaddingY = Math.max(0, (renderer._viewport.height - renderer.layout.dimensions.height) / 2);

        // The following absolute values are experimental values to highlight the square on the first page of Salzinnes, CDN-Hsmu M2149.L4
        // The relative values are used to scale the highlights according to the zoom level on the page itself
        let absoluteRectOriginX = point.relativeOriginX * scaleRatio;
        let absoluteRectOriginY = point.relativeOriginY * scaleRatio;

        // This indicates the page on top of which the highlights are supposed to be drawn
        let highlightPageIndex = point.pageIndex;

        if (pageIndex === highlightPageIndex)
        {
            // Calculates where the highlights should be drawn as a function of the whole webpage coordinates
            // (to make it look like it is on top of a page in Diva)
            let highlightXOffset = renderer._getImageOffset(pageIndex).left - renderer._viewport.left + viewportPaddingX + absoluteRectOriginX;
            let highlightYOffset = renderer._getImageOffset(pageIndex).top - renderer._viewport.top + viewportPaddingY + absoluteRectOriginY;

            //Draw the rectangle
            let rgba = null;
            switch (layer.layerType)
            {
                case 0:
                    rgba = "rgba(51, 102, 255, " + opacity + ")";
                    break;
                case 1:
                    rgba = "rgba(255, 51, 102, " + opacity + ")";
                    break;
                case 2:
                    rgba = "rgba(255, 255, 10 , " + opacity + ")";
                    break;
                case 3:
                    rgba = "rgba(10, 255, 10, " + opacity + ")";
                    break;
                case 4:
                    rgba = "rgba(120, 0, 120, " + opacity + ")";
                    break;
                default:
                    rgba = "rgba(255, 0, 0, " + opacity + ")";
            }

            if(isDown)
            {
                renderer._ctx.beginPath();
                renderer._ctx.strokeStyle = rgba;
                renderer._ctx.lineWidth = 3;
                renderer._ctx.lineJoin = "round";
                renderer._ctx.moveTo(this.lastX, this.lastY);
                renderer._ctx.lineTo(highlightXOffset, highlightYOffset);
                renderer._ctx.closePath();
                renderer._ctx.stroke();
            }

            this.lastX = highlightXOffset;
            this.lastY = highlightYOffset;
        }
    }



    drawHighlights(args)
    {
        var pageIndex = args[0],
            zoomLevel = args[1];

        this.layers.forEach((layer) => {
            var highlights = layer.areas;

            highlights.forEach((highlighted) =>
                {
                    this.drawHighlight(layer, highlighted, pageIndex, zoomLevel);
                }
            );


            var paths = layer.paths;
            paths.forEach((group) =>
                {
                    var isDown = false;
                    group.path.forEach((point) =>
                    {
                        this.drawPath(layer, point, pageIndex, zoomLevel, isDown);
                        isDown = true;
                    });
                }
            );
        });
    }

    /**
     * Enables the layering plugin and stops it from being repetitively called.
     **/
    handleClick (event, settings, publicInstance, pageIndex)
    {
        if (!this.activated)
        {
            this.handle = this.activatePlugin();
            this.intializeMatrix();
        }
        else
        {
            this.deactivatePlugin();
        }
    }

    /**
     * Initializes the base matrix that maps the real-size picture
     **/
    intializeMatrix()
    {
        if (this.matrix === null)
        {
            let pageIndex = this.core.getSettings().currentPageIndex;
            let maxZoomLevel = this.core.getSettings().maxZoomLevel;
            var height = this.core.publicInstance.getPageDimensionsAtZoomLevel(pageIndex, maxZoomLevel).height,
                width = this.core.publicInstance.getPageDimensionsAtZoomLevel(pageIndex, maxZoomLevel).width;

            this.matrix = new Array(width).fill(null).map(() => new Array(height).fill(0));
        }
    }

    createIcon ()
    {
        const pageToolsIcon = document.createElement('div');
        pageToolsIcon.classList.add('diva-pixel-icon');

        let root = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        root.setAttribute("x", "0px");
        root.setAttribute("y", "0px");
        root.setAttribute("viewBox", "0 0 25 25");
        root.id = `${this.core.settings.selector}pixel-icon`;

        let g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.id = `${this.core.settings.selector}pixel-icon-glyph`;
        g.setAttribute("transform", "matrix(1, 0, 0, 1, -11.5, -11.5)");
        g.setAttribute("class", "diva-pagetool-icon");

        //Placeholder icon
        let rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute('x', '15');
        rect.setAttribute('y', '10');
        rect.setAttribute('width', '25');
        rect.setAttribute('height', 25);

        g.appendChild(rect);
        root.appendChild(g);

        pageToolsIcon.appendChild(root);

        return pageToolsIcon;
    }
}

export class HighlightArea
{
    constructor (relativeRectOriginX, relativeRectOriginY, relativeRectWidth, relativeRectHeight, pageIndex)
    {
        this.relativeRectOriginX = relativeRectOriginX;
        this.relativeRectOriginY = relativeRectOriginY;
        this.relativeRectWidth = relativeRectWidth;
        this.relativeRectHeight = relativeRectHeight;
        this.pageIndex = pageIndex;
    }
}

export class Path
{
    constructor ()
    {
        this.path = [];
    }

    addPointToPath(point)
    {
        this.path.push(point);
    }
}

export class Point
{
    constructor (relativeOriginX, relativeOriginY, pageIndex)
    {
        this.relativeOriginX = relativeOriginX;
        this.relativeOriginY = relativeOriginY;
        this.pageIndex = pageIndex;
    }
}

export class Layer
{
    constructor (layerType, opacity, areas)
    {
        this.layerType = layerType;
        this.opacity = opacity;
        this.areas = areas;
        this.paths = [];
    }

    addAreaToLayer(area)
    {
        this.areas.push(area);
    }

    addPathToLayer(path)
    {
        this.paths.push(path);
    }

    addToLastPath(point)
    {
        // FIXME: Need to check that the list of paths is not empty
        if (this.paths !== null)
        {
            this.paths[this.paths.length - 1].addPointToPath(point);
        }
    }

    createNewPath(point)
    {
        this.paths.push(new Path());
    }
}

PixelPlugin.prototype.pluginName = "pixel";
PixelPlugin.prototype.isPageTool = true;

/**
 * Make this plugin available in the global context
 * as part of the 'Diva' namespace.
 **/
(function (global)
{
    global.Diva.PixelPlugin = PixelPlugin;
})(window);
