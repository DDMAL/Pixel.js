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
        this.visibleTilesHandle = null;
        this.mouseHandles = null;
        this.keyboardHandles = null;
        this.layers = null;
        this.matrix = null;
        this.mousePressed = false;
        this.keyboardPress = false;
        this.lastX, this.lastY;
        this.selectedLayer = 0;
        this.keyboardChangingLayers = false;
        this.actions = [];
        this.shiftDown = false;
    }

    /**
     * ===============================================
     *         Plugin Activation/Deactivation
     * ===============================================
     **/

    handleClick (event, settings, publicInstance, pageIndex)
    {
        if (!this.activated)
            this.activatePlugin();
        else
            this.deactivatePlugin();
    }

    activatePlugin()
    {
        if(this.layers === null)
        {
            // Start by creating layers
            let layer1 = new Layer(0, 0.8);
            let layer2 = new Layer(1, 0.8);
            let layer3 = new Layer(2, 0.8);
            let layer4 = new Layer(3, 0.8);
            let layer5 = new Layer(4, 0.8);
            layer1.addShapeToLayer(new Rectangle(23, 42, 24, 24, 0));
            layer2.addShapeToLayer(new Rectangle(48, 50, 57, 5, 0));
            layer3.addShapeToLayer(new Rectangle(50, 120, 50, 10, 0));

            this.layers = [layer1, layer2, layer3, layer4, layer5];
        }

        this.initializeMatrix();
        this.visibleTilesHandle = this.subscribeToVisibleTilesEvent();
        this.mouseHandles = this.subscribeToMouseEvents();
        this.keyboardHandles = this.subscribeToKeyboardEvents();
        this.keyboardPress = this.subscribeToKeyboardPress();
        this.createPluginElements(this.layers);
        this.repaint();  // Repaint the tiles to retrigger VisibleTilesDidLoad
        this.activated = true;
    }

    deactivatePlugin()
    {
        Diva.Events.unsubscribe(this.visibleTilesHandle);
        this.unsubscribeFromMouseEvents();
        this.unsubscribeFromKeyboardEvents();
        this.unsubscribeFromKeyboardPress();
        this.repaint(); // Repaint the tiles to make the highlights disappear off the page
        this.destroyPluginElements(this.layers);
        this.activated = false;
    }

    /**
     * ===============================================
     *        Event Subscription/Unsubscription
     * ===============================================
     **/

    subscribeToVisibleTilesEvent()
    {
        let handle = Diva.Events.subscribe('VisibleTilesDidLoad', (args) =>
        {
            this.drawHighlights(args);
        });
        return handle;
    }

    subscribeToMouseEvents()
    {
        let canvas = document.getElementById("diva-1-outer");

        this.boundInitializeNewPath = (evt) => { this.initializeNewPath(canvas, evt); };
        this.disableMousePressed = () => { this.endPath() };
        this.setupPainting = (evt) => { this.setupPointPainting(canvas, evt); };

        canvas.addEventListener('mousedown', this.boundInitializeNewPath);
        canvas.addEventListener('mouseup', this.disableMousePressed);
        canvas.addEventListener('mouseleave', this.disableMousePressed);
        canvas.addEventListener('mousemove', this.setupPainting, false);

        return{
            mouthDownHandle: this.boundInitializeNewPath,
            mouseMoveHandle: this.setupPainting,
            mouseUpHandle: this.disableMousePressed
        };
    }

    //Deals with keyboard button release
    subscribeToKeyboardEvents()
    {
        let handle = (e) =>
        {
            const key1 = 49;
            const key9 = 56;
            const shiftKey = 16;

            let lastLayer = this.selectedLayer;
            let numberOfLayers = this.layers.length;
            let key = e.keyCode ? e.keyCode : e.which;

            if (key >= key1 && key < key1 + numberOfLayers && key <= key9)
            {
                this.selectedLayer = key - key1;
                document.getElementById("layer " + this.selectedLayer).checked = true;

                if (lastLayer !== this.selectedLayer && this.mousePressed)
                    this.keyboardChangingLayers = true;
            }
            if (key === shiftKey)
            {
                this.shiftDown = false;
            }
        };
        document.addEventListener("keyup", handle);
        return handle;

    }

    //Deals with keyboard button down press
    subscribeToKeyboardPress()
    {
        let handle = (e) =>
        {
            const shiftKey = 16;
            let key = e.keyCode ? e.keyCode : e.which;

            if (key === shiftKey)
            {
                this.shiftDown = true;
            }
        };
        document.addEventListener("keydown", handle);
        return handle;

    }

    unsubscribeFromMouseEvents()
    {
        var canvas = document.getElementById("diva-1-outer");

        canvas.removeEventListener('mousedown', this.mouseHandles.mouthDownHandle);
        canvas.removeEventListener('mouseup', this.mouseHandles.mouseUpHandle);
        canvas.removeEventListener('mouseleave', this.mouseHandles.mouseUpHandle);
        canvas.removeEventListener('mousemove', this.mouseHandles.mouseMoveHandle);
    }

    unsubscribeFromKeyboardEvents()
    {
        document.removeEventListener("keyup", this.keyboardHandles);
    }

    unsubscribeFromKeyboardPress()
    {
        document.removeEventListener("keydown", this.keyboardHandles);
    }

    /**
     * ===============================================
     *                HTML UI Elements
     * ===============================================
     **/

    createPluginElements(layers)
    {
        this.createUndoButton();
        this.createLayerSelectors(layers);
        this.createBrushSizeSelector();
    }

    destroyPluginElements(layers)
    {
        this.destroyLayerSelectors();
        this.destroyBrushSizeSelector();
        this.destroyUndoButton();
    }

    createOpacitySlider(layer, parentElement)
    {
        var opacitySlider = document.createElement("input");

        opacitySlider.setAttribute("id", "layer " + layer.layerType + " opacity");
        opacitySlider.setAttribute("type", "range");
        opacitySlider.setAttribute('max', 100);
        opacitySlider.setAttribute('min', 0);
        opacitySlider.setAttribute('value', layer.opacity*100);
        opacitySlider.addEventListener("input", () =>
        {
            layer.opacity = opacitySlider.value/100;
            this.repaint();
        });

        parentElement.appendChild(opacitySlider);
    }

    destroyOpacitySlider(layer)
    {
        let opacitySlider = document.getElementById("layer " + layer.layerType + " opacity");
        document.body.removeChild(opacitySlider);
    }

    createLayerSelectors(layers)
    {
        let form = document.createElement("form");

        form.setAttribute("id", "layer selector");
        form.setAttribute("action", "");

        layers.forEach((layer) =>
        {
            let radio = document.createElement("input");
            let content = document.createTextNode("Layer " + (layer.layerType + 1));
            let br = document.createElement("br");

            radio.setAttribute("id", "layer " + layer.layerType);
            radio.setAttribute("type", "radio");
            radio.setAttribute("value", layer.layerType);
            radio.setAttribute("name", "layer selector");
            radio.onclick = () => { this.selectedLayer = radio.value; };

            if (layer.layerType === 0)      // Layer 0 is checked by default
                radio.checked = true;

            form.appendChild(radio);
            form.appendChild(content);
            this.createOpacitySlider(layer, form);
            form.appendChild(br);
        });
        document.body.appendChild(form);
    }

    destroyLayerSelectors()
    {
        let form = document.getElementById("layer selector");
        document.body.removeChild(form);
    }

    createBrushSizeSelector()
    {
        let brushSizeSelector = document.createElement("input");
        brushSizeSelector.setAttribute("id", "brush size selector");
        brushSizeSelector.setAttribute("type", "range");
        brushSizeSelector.setAttribute('max', 50);
        brushSizeSelector.setAttribute('min', 1);
        brushSizeSelector.setAttribute('value', 10);
        document.body.appendChild(brushSizeSelector);
    }

    destroyBrushSizeSelector()
    {
        let brushSizeSelector = document.getElementById("brush size selector");
        document.body.removeChild(brushSizeSelector);
    }

    createUndoButton()
    {
        let undoButton = document.createElement("button");
        let text = document.createTextNode("Undo");
        let br = document.createElement("br");

        this.undoFunction = () => { this.removeAction(this.actions.length - 1); };

        br.setAttribute("id", "undo button break");
        undoButton.setAttribute("id", "undo button");
        undoButton.appendChild(text);
        undoButton.addEventListener("click", this.undoFunction);

        document.body.appendChild(undoButton);
        document.body.appendChild(br);
    }

    destroyUndoButton()
    {
        let undoButton = document.getElementById("undo button");
        document.body.removeChild(undoButton);

        let br = document.getElementById("undo button break");
        document.body.removeChild(br);
    }

    /**
     * ===============================================
     *                   Drawing
     * ===============================================
     **/

    initializeNewPath(canvas, evt)
    {
        this.mousePressed = true;

        let pageIndex = this.core.getSettings().currentPageIndex;
        let zoomLevel = this.core.getSettings().zoomLevel;
        let mousePos = this.getMousePos(canvas, evt);
        let relativeCoords = this.getRelativeCoordinates(mousePos.x, mousePos.y);

        if (this.isInPageBounds(relativeCoords.x, relativeCoords.y))
        {
            let selectedLayer = this.layers[this.selectedLayer];
            let point = new Point(relativeCoords.x, relativeCoords.y, pageIndex);
            let brushSize = document.getElementById("brush size selector").value/10;

            selectedLayer.createNewPath(brushSize);
            selectedLayer.addToCurrentPath(point);

            this.actions.push(new Action(selectedLayer.getCurrentPath(), selectedLayer));
            this.drawPath(selectedLayer, point, pageIndex, zoomLevel, brushSize, false);
        }
        else
        {
            this.mousePressed = false;
        }
    }

    setupPointPainting (canvas, evt)
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
                let pageIndex = this.core.getSettings().currentPageIndex;
                let zoomLevel = this.core.getSettings().zoomLevel;
                let mousePos = this.getMousePos(canvas, evt);
                let relativeCoords = this.getRelativeCoordinates(mousePos.x, mousePos.y);

                if (this.isInPageBounds(relativeCoords.x, relativeCoords.y))
                {
                    let point = new Point(relativeCoords.x, relativeCoords.y, pageIndex);
                    let brushSize = this.layers[this.selectedLayer].getCurrentPath().brushSize;

                    this.layers[this.selectedLayer].addToCurrentPath(point);
                    this.drawPath(this.layers[this.selectedLayer], point, pageIndex, zoomLevel, brushSize, true);
                }
            }
        }
    }

    removeAction (index)
    {
        if(this.actions.length > 0 && this.actions.length >= index)
        {
            let actionToRemove = this.actions[index];
            actionToRemove.layer.removePathFromLayer(actionToRemove.path);
            this.actions.splice(index, 1);
            this.repaint();
        }
    }

    endPath ()
    {
        this.mousePressed = false;
        this.repaint();
    }

    repaint()
    {
        this.core.getSettings().renderer._paint();
    }

    isInPageBounds(relativeX, relativeY)
    {
        let pageDimensions = this.core.publicInstance.getCurrentPageDimensionsAtCurrentZoomLevel();
        let absolutePageOrigin = this.getAbsoluteCoordinates(0,0);
        let absolutePageWidthOffset = pageDimensions.width + absolutePageOrigin.x;  //Taking into account the padding, etc...
        let absolutePageHeightOffset = pageDimensions.height + absolutePageOrigin.y;
        let relativeBounds = this.getRelativeCoordinates(absolutePageWidthOffset, absolutePageHeightOffset);

        if (relativeX < 0 || relativeY < 0 || relativeX > relativeBounds.x || relativeY > relativeBounds.y)
        {
            return false;
        }

        return true;
    }

    getMousePos(canvas, evt)
    {
        let rect = canvas.getBoundingClientRect();

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

        return{
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

        return{
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

        this.layers.forEach((layer) =>
        {
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
     * ===============================================
     *                    Backend
     * ===============================================
     **/

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
        let scaleRatio = Math.pow(2, maxZoomLevel);
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

    removePathFromLayer(path)
    {
        let index = this.paths.indexOf(path);
        this.paths.splice(index, 1);
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