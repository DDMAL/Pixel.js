import {Path} from './path';

export class Layer
{
    constructor (layerId, colour, layerName, divaCanvas)
    {
        this.layerId = layerId;
        this.shapes = [];
        this.paths = [];
        this.colour = colour;
        this.layerName = layerName;
        this.canvas = null;
        this.ctx = null;
        this.actions = [];
        this.activated = true;
        this.cloneCanvas(divaCanvas);
    }

    cloneCanvas (divaCanvas)
    {
        this.canvas = document.createElement('canvas');
        this.canvas.setAttribute("class", "pixel-canvas");
        this.canvas.setAttribute("id", "layer-" + this.layerId + "-canvas");
        this.canvas.width = divaCanvas.width;
        this.canvas.height = divaCanvas.height;

        this.ctx = this.canvas.getContext('2d');
    }

    placeCanvasAfterElement (element)
    {
        element.parentNode.insertBefore(this.canvas, element.nextSibling);
    }

    getCanvas ()
    {
        return this.canvas;
    }

    getCtx ()
    {
        return this.ctx;
    }

    clearCtx ()
    {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    updateLayerName (newLayerName)
    {
        this.layerName = newLayerName;
    }

    addShapeToLayer (shape)
    {
        this.shapes.push(shape);
        this.actions.push(shape);
    }

    addPathToLayer (path)
    {
        this.paths.push(path);
        this.actions.push(path);
    }

    /**
     * Creates a new path that has the brush size selector width
     * @param point
     */
    addToCurrentPath (point, blendMode)
    {
        if (this.paths.length === 0)
        {
            let brushSizeSelector = document.getElementById("brush-size-selector");
            this.createNewPath(brushSizeSelector.value / 10, blendMode);
        }
        this.paths[this.paths.length - 1].addPointToPath(point);
    }

    getCurrentPath ()
    {
        if (this.paths.length > 0)
            return this.paths[this.paths.length - 1];
        else
            return null;
    }

    createNewPath (brushSize, blendMode)
    {
        let path = new Path(brushSize, blendMode);
        this.paths.push(path);
        this.actions.push(path);
    }

    removePathFromLayer (path)
    {
        let index = this.paths.indexOf(path);
        this.paths.splice(index, 1);

        let actionIndex = this.actions.indexOf(path);
        this.actions.splice(actionIndex, 1);
    }

    removeShapeFromLayer (shape)
    {
        let index = this.shapes.indexOf(shape);
        this.shapes.splice(index, 1);

        let actionIndex = this.actions.indexOf(shape);
        this.actions.splice(actionIndex, 1);
    }

    setOpacity (opacity)
    {
        this.colour.alpha = opacity;
    }

    getOpacity ()
    {
        return this.colour.alpha;
    }

    getCurrentShape ()
    {
        if (this.shapes.length > 0)
        {
            return this.shapes[this.shapes.length - 1];
        }
        else
        {
            return null;
        }
    }

    deactivateLayer ()
    {
        this.activated = false;
        this.clearCtx();
    }

    activateLayer ()
    {
        this.activated = true;
    }

    toggleLayerActivation ()
    {
        this.activated = !this.activated;
    }

    isActivated ()
    {
        return this.activated;
    }
}