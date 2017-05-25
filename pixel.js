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
        this.selectedLayer = 0;
        this.keyboardChangingLayers = false;
        this.actions = [];
    }

    // Subscribes to VisibleTilesDidLoad event to start drawing highlights.
    // Takes an array of highlighted objects
    activatePlugin()
    {
        if(this.layers === null){
            // Start by creating layers
            let layer1 = new Layer(0, 0.3);
            let layer2 = new Layer(1, 0.5);
            let layer3 = new Layer(2, 0.8);
            let layer4 = new Layer(3, 0.8);
            let layer5 = new Layer(4, 0.8);
            layer1.addShapeToLayer(new Rectangle(23, 42, 24, 24, 0));
            layer2.addShapeToLayer(new Rectangle(48, 50, 57, 5, 0));
            layer3.addShapeToLayer(new Rectangle(50, 120, 50, 10, 0));

            this.layers = [layer1, layer2, layer3, layer4, layer5];
        }

        let handle = this.subscribeToEvent();
        this.core.getSettings().renderer._paint();  // Repaint the tiles to retrigger VisibleTilesDidLoad
        this.activated = true;
        this.createPluginElements(this.layers);
        this.subscribeToMouseEvents();
        this.handleKeyboardEvents();
        return handle;
    }

    handleKeyboardEvents()
    {
        const key1 = 49;
        const key9 = 56;

        window.onkeyup = (e) =>
        {
            let lastLayer = this.selectedLayer;
            let numberOfLayers = this.layers.length;
            let key = e.keyCode ? e.keyCode : e.which;

            if (key >= key1 && key < key1 + numberOfLayers && key <= key9)
            {
                this.selectedLayer = key - 49;
                let radio = document.getElementById("layer " + this.selectedLayer);
                radio.checked = true;

                if (lastLayer !== this.selectedLayer)
                {
                    this.keyboardChangingLayers = true;
                }

            }
        };
    }

    // This will allow drawing on mouse hold
    subscribeToMouseEvents()
    {
        var canvas = document.getElementById("diva-1-outer");

        canvas.addEventListener('mousedown', (evt) =>
        {
            this.initializeNewPath(canvas, evt);
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
            this.paintPath(canvas, evt);
        }, false);
    }

    unsubscribeFromMouseEvents()
    {
        var canvas = document.getElementById("diva-1-outer");

        canvas.removeEventListener('mousedown', (evt) =>
        {
            this.initializeNewPath(canvas, evt);
        });

        canvas.removeEventListener('mouseup', (evt) =>
        {
            this.mousePressed = false;
        });

        canvas.removeEventListener('mouseleave', (evt) =>
        {
            this.mousePressed = false;
        });

        canvas.removeEventListener('mousemove', (evt) =>
        {
            this.paintPath(canvas, evt);
        }, false);
    }

    paintPath (canvas, evt)
    {
        if (this.mousePressed)
        {
            if (this.keyboardChangingLayers)
            {
                this.initializeNewPath(canvas, evt);
                this.keyboardChangingLayers = false;
            }
            else
            {
                this.mousePressed = true;
                let pageIndex = this.core.getSettings().currentPageIndex;
                let zoomLevel = this.core.getSettings().zoomLevel;
                let mousePos = this.getMousePos(canvas, evt);
                let relativeCoords = this.getRelativeCoordinates(mousePos.x, mousePos.y);

                if (this.isInPageBounds(relativeCoords.x, relativeCoords.y))
                {
                    let point = new Point(relativeCoords.x, relativeCoords.y, pageIndex);
                    this.layers[this.selectedLayer].addToCurrentPath(point);
                    let brushSize = this.layers[this.selectedLayer].getCurrentPath().brushSize;
                    this.drawPath(this.layers[this.selectedLayer], point, pageIndex, zoomLevel, brushSize, true);
                }
                else
                {
                    this.mousePressed = false;
                }
            }
        }
    }


    initializeNewPath(canvas, evt)
    {
        this.mousePressed = true;
        let pageIndex = this.core.getSettings().currentPageIndex;
        let zoomLevel = this.core.getSettings().zoomLevel;
        let mousePos = this.getMousePos(canvas, evt);
        let relativeCoords = this.getRelativeCoordinates(mousePos.x, mousePos.y);

        if (this.isInPageBounds(relativeCoords.x, relativeCoords.y))
        {
            let point = new Point(relativeCoords.x, relativeCoords.y, pageIndex);
            let brushSizeSelector = document.getElementById("brush size selector");
            this.layers[this.selectedLayer].createNewPath(brushSizeSelector.value/10);
            this.layers[this.selectedLayer].addToCurrentPath(point);
            let brushSize = this.layers[this.selectedLayer].getCurrentPath().brushSize;

            this.actions.push(new Action(this.layers[this.selectedLayer].getCurrentPath(), this.layers[this.selectedLayer]));

            this.drawPath(this.layers[this.selectedLayer], point, pageIndex, zoomLevel, brushSize, false);
        }
        else
        {
            this.mousePressed = false;
        }
    }


    isInPageBounds(relativeX, relativeY)
    {
        let pageDimensions = this.core.publicInstance.getCurrentPageDimensionsAtCurrentZoomLevel();
        let absolutePageOrigin = this.getAbsoluteCoordinates(0,0);
        let absolutePageWidthOffset = pageDimensions.width + absolutePageOrigin.x;  //Taking into account the padding, etc...
        let absolutePageHeightOffset = pageDimensions.height + absolutePageOrigin.y;
        var relativeBounds = this.getRelativeCoordinates(absolutePageWidthOffset, absolutePageHeightOffset);

        if(relativeX < 0 || relativeY < 0 || relativeX > relativeBounds.x || relativeY > relativeBounds.y)
        {
            return false;
        }
        return true;
    }

    deactivatePlugin()
    {
        Diva.Events.unsubscribe(this.handle);

        this.unsubscribeFromMouseEvents();

        this.core.getSettings().renderer._paint(); // Repaint the tiles to make the highlights disappear off the page
        this.activated = false;
        this.destroyPluginElements(this.layers);
    }

    createOpacitySlider(layer)
    {
        var x = document.createElement("input");
        x.setAttribute("id", "layer " + layer.layerType + " opacity");
        x.setAttribute("type", "range");
        x.setAttribute('max', 100);
        x.setAttribute('min', 0);
        x.setAttribute('value', layer.opacity*100);
        document.body.appendChild(x);

        var rangeInput = document.getElementById("layer " + layer.layerType + " opacity");
        rangeInput.addEventListener("input", () =>
        {
            layer.opacity = rangeInput.value/100;
            this.core.getSettings().renderer._paint();
        });
    }

    destroyOpacitySlider(layer)
    {
        var rangeInput = document.getElementById("layer " + layer.layerType + " opacity");
        document.body.removeChild(rangeInput);
    }

    createLayerSelectors(layers){
        var form = document.createElement("form");
        form.setAttribute("id", "layer selector");
        form.setAttribute("action", "");

        layers.forEach((layer) =>
        {
            var radio = document.createElement("input");
            radio.setAttribute("id", "layer " + layer.layerType);
            radio.setAttribute("type", "radio");
            radio.setAttribute("value", layer.layerType);
            radio.setAttribute("name", "layer selector");
            if (layer.layerType === 0)
            {
                radio.checked = true;
            }
            form.appendChild(radio);

            var content = document.createTextNode("Layer " + (layer.layerType + 1));
            form.appendChild(content);

            var br = document.createElement("br");
            form.appendChild(br);

            radio.onclick = () =>
            {
                this.selectedLayer = radio.value;
            };
        });
        document.body.appendChild(form);
    }

    destroyLayerSelectors()
    {
        var form = document.getElementById("layer selector");
        document.body.removeChild(form);
    }

    createBrushSizeSelector()
    {
        var brushSizeSelector = document.createElement("input");
        brushSizeSelector.setAttribute("id", "brush size selector");
        brushSizeSelector.setAttribute("type", "range");
        brushSizeSelector.setAttribute('max', 50);
        brushSizeSelector.setAttribute('min', 1);
        brushSizeSelector.setAttribute('value', 10);
        document.body.appendChild(brushSizeSelector);
    }

    destroyBrushSizeSelector()
    {
        var brushSizeSelector = document.getElementById("brush size selector");
        document.body.removeChild(brushSizeSelector);
    }

    createPluginElements(layers)
    {
        this.createLayerSelectors(layers);
        this.createBrushSizeSelector();
        layers.forEach((layer) => {
            this.createOpacitySlider(layer);
        });
    }

    destroyPluginElements(layers){
        this.destroyLayerSelectors();
        this.destroyBrushSizeSelector();
        layers.forEach((layer) => {
            this.destroyOpacitySlider(layer);
        });
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

    getAbsoluteCoordinates(relativeX, relativeY)
    {
        let pageIndex = this.core.getSettings().currentPageIndex;
        let zoomLevel = this.core.getSettings().zoomLevel;

        let renderer = this.core.getSettings().renderer;
        let scaleRatio = Math.pow(2,zoomLevel);

        const viewportPaddingX = Math.max(0, (renderer._viewport.width - renderer.layout.dimensions.width) / 2);
        const viewportPaddingY = Math.max(0, (renderer._viewport.height - renderer.layout.dimensions.height) / 2);

        let absoluteX = relativeX * scaleRatio;
        let absoluteY = relativeY * scaleRatio;

        // Calculates where the highlights should be drawn as a function of the whole webpage coordinates
        // (to make it look like it is on top of a page in Diva)
        let absoluteOffsetX = renderer._getImageOffset(pageIndex).left - renderer._viewport.left + viewportPaddingX + absoluteX;
        let absoluteOffsetY = renderer._getImageOffset(pageIndex).top - renderer._viewport.top + viewportPaddingY + absoluteY;

        return {
            x: absoluteOffsetX,
            y: absoluteOffsetY
        };
    }


    drawShape(layer, shape, pageIndex, zoomLevel)
    {
        let opacity = layer.opacity;
        let renderer = this.core.getSettings().renderer;
        let scaleRatio = Math.pow(2,zoomLevel);

        const viewportPaddingX = Math.max(0, (renderer._viewport.width - renderer.layout.dimensions.width) / 2);
        const viewportPaddingY = Math.max(0, (renderer._viewport.height - renderer.layout.dimensions.height) / 2);

        // The following absolute values are experimental values to highlight the square on the first page of Salzinnes, CDN-Hsmu M2149.L4
        // The relative values are used to scale the highlights according to the zoom level on the page itself
        let absoluteRectOriginX = shape.relativeRectOriginX * scaleRatio;
        let absoluteRectOriginY = shape.relativeRectOriginY * scaleRatio;
        let absoluteRectWidth = shape.relativeRectWidth * scaleRatio;
        let absoluteRectHeight = shape.relativeRectHeight * scaleRatio;

        // This indicates the page on top of which the highlights are supposed to be drawn
        let highlightPageIndex = shape.pageIndex;

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

    drawPath(layer, point, pageIndex, zoomLevel, brushSize, isDown)
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
                renderer._ctx.lineWidth = brushSize * scaleRatio;
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
        let pageIndex = args[0],
            zoomLevel = args[1];

        this.layers.forEach((layer) => {
            let shapes = layer.shapes;

            shapes.forEach((shape) =>
                {
                    this.drawShape(layer, shape, pageIndex, zoomLevel);
                }
            );

            let paths = layer.paths;
            paths.forEach((path) =>
                {
                    let isDown = false;
                    path.points.forEach((point) =>
                    {
                        this.drawPath(layer, point, pageIndex, zoomLevel, path.brushSize, isDown);
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
            this.initializeMatrix();
        }
        else
        {
            this.deactivatePlugin();
        }
    }

    /**
     * Initializes the base matrix that maps the real-size picture
     **/
    initializeMatrix()
    {
        if (this.matrix === null)
        {
            let pageIndex = this.core.getSettings().currentPageIndex,
                maxZoomLevel = this.core.getSettings().maxZoomLevel;
            let height = this.core.publicInstance.getPageDimensionsAtZoomLevel(pageIndex, maxZoomLevel).height,
                width = this.core.publicInstance.getPageDimensionsAtZoomLevel(pageIndex, maxZoomLevel).width;
            this.matrix = new Array(width).fill(null).map(() => new Array(height).fill(0));
        }
    }

    /**
     * Fills the base matrix with type data outlined by the layer drawings
     * @param path object containing points
     * @param layer The targeted layer containing the pixels to map
     */
    fillMatrix(path, layer)
    {
        let maxZoomLevel = this.core.getSettings().maxZoomLevel;
        var scaleRatio = Math.pow(2, maxZoomLevel);
        path.points.forEach((point) =>
        {
            let absoluteOriginX = point.relativeRectOriginX * scaleRatio,
                absoluteOriginY = point.relativeRectOriginY * scaleRatio;
            this.matrix[absoluteOriginX][absoluteOriginY] = layer.layerType;
        });
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

export class Rectangle
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
    constructor (brushSize)
    {
        this.points = [];
        this.brushSize = brushSize;
    }

    addPointToPath(point)
    {
        this.points.push(point);
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

export class Action
{
    constructor (path, layer)
    {
        this.path = path;
        this.layer = layer;
    }
}

export class Layer
{
    constructor (layerType, opacity)
    {
        this.layerType = layerType;
        this.opacity = opacity;
        this.shapes = [];
        this.paths = [];
    }

    addShapeToLayer(shape)
    {
        this.shapes.push(shape);
    }

    addPathToLayer(path)
    {
        this.paths.push(path);
    }

    addToCurrentPath(point)
    {
        if (this.paths.length === 0)
        {
            let brushSizeSelector = document.getElementById("brush size selector");
            this.createNewPath(brushSizeSelector.value/10);
        }
        this.paths[this.paths.length - 1].addPointToPath(point);
    }

    getCurrentPath()
    {
        return this.paths[this.paths.length - 1];
    }

    createNewPath(brushSize)
    {
        this.paths.push(new Path(brushSize));
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